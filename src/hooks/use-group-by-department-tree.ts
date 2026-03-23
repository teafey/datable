"use client"

import * as React from "react"
import type { DepartmentHierarchyInfo } from "@/lib/api/departments"

export interface DepartmentTreeGroup<T> {
  departmentId: string
  departmentName: string
  level: number
  managerNames: string[]
  items: T[]
  totalCount: number
  children: DepartmentTreeGroup<T>[]
}

export interface UseGroupByDepartmentTreeResult<T> {
  tree: DepartmentTreeGroup<T>[]
  collapsedNodes: Set<string>
  toggleNode: (id: string) => void
  expandAll: () => void
  collapseAll: () => void
}

export interface UseGroupByDepartmentTreeOptions {
  defaultCollapsed?: boolean
}

/**
 * Hook for grouping items by department in a hierarchical tree structure.
 *
 * Algorithm:
 * 1. Group items by departmentId
 * 2. Build full tree from hierarchy (2-pass: create nodes, link children by parentId)
 * 3. Post-order traversal: compute totalCount = own items + sum of children totalCount
 * 4. Pruning: remove branches with totalCount === 0
 * 5. Single-child root collapsing: if root has no items and one child, promote child
 */
export function useGroupByDepartmentTree<T>(
  items: T[],
  getDepartmentId: (item: T) => string | null,
  hierarchy: DepartmentHierarchyInfo[],
  enabled: boolean,
  options: UseGroupByDepartmentTreeOptions = {}
): UseGroupByDepartmentTreeResult<T> {
  const { defaultCollapsed = true } = options
  const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set())
  const initializedRef = React.useRef(false)

  const tree = React.useMemo(() => {
    if (!enabled || hierarchy.length === 0) return []

    // 1. Group items by departmentId
    const itemsByDept = new Map<string, T[]>()
    const noDeptItems: T[] = []

    for (const item of items) {
      const deptId = getDepartmentId(item)
      if (!deptId) {
        noDeptItems.push(item)
        continue
      }
      const arr = itemsByDept.get(deptId) || []
      arr.push(item)
      itemsByDept.set(deptId, arr)
    }

    // 2. Build tree from hierarchy
    type TreeNode = {
      id: string
      name: string
      parentId: string | null
      managerNames: string[]
      items: T[]
      children: TreeNode[]
      totalCount: number
    }

    const nodeMap = new Map<string, TreeNode>()
    for (const dept of hierarchy) {
      nodeMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        parentId: dept.parentId,
        managerNames: dept.managerNames,
        items: itemsByDept.get(dept.id) || [],
        children: [],
        totalCount: 0,
      })
    }

    const roots: TreeNode[] = []
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    // Sort children by name
    const sortChildren = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name, "ru"))
      for (const node of nodes) {
        sortChildren(node.children)
      }
    }
    sortChildren(roots)

    // 3. Post-order traversal: compute totalCount
    const computeTotalCount = (node: TreeNode): number => {
      let count = node.items.length
      for (const child of node.children) {
        count += computeTotalCount(child)
      }
      node.totalCount = count
      return count
    }
    for (const root of roots) {
      computeTotalCount(root)
    }

    // 4. Pruning: remove branches with totalCount === 0
    const prune = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .filter(n => n.totalCount > 0)
        .map(n => ({
          ...n,
          children: prune(n.children),
        }))
    }
    let prunedRoots = prune(roots)

    // 5. Single-child root collapsing: if root has no items and one child, promote child
    const collapseEmpty = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(n => {
        if (n.items.length === 0 && n.children.length === 1) {
          // Promote the single child to replace this node
          const child = n.children[0]
          return collapseEmpty([child])[0]
        }
        return {
          ...n,
          children: collapseEmpty(n.children),
        }
      })
    }
    prunedRoots = collapseEmpty(prunedRoots)

    // Convert to DepartmentTreeGroup with levels
    const toTreeGroup = (node: TreeNode, level: number): DepartmentTreeGroup<T> => ({
      departmentId: node.id,
      departmentName: node.name,
      level,
      managerNames: node.managerNames,
      items: node.items,
      totalCount: node.totalCount,
      children: node.children.map(c => toTreeGroup(c, level + 1)),
    })

    const result = prunedRoots.map(r => toTreeGroup(r, 0))

    // Add "Без отдела" group if there are items without department
    if (noDeptItems.length > 0) {
      result.push({
        departmentId: "__no_department__",
        departmentName: "Без отдела",
        level: 0,
        managerNames: [],
        items: noDeptItems,
        totalCount: noDeptItems.length,
        children: [],
      })
    }

    return result
  }, [items, getDepartmentId, hierarchy, enabled])

  // Collect all node IDs for collapse/expand operations
  const allNodeIds = React.useMemo(() => {
    const ids: string[] = []
    const collect = (nodes: DepartmentTreeGroup<T>[]) => {
      for (const node of nodes) {
        ids.push(node.departmentId)
        collect(node.children)
      }
    }
    collect(tree)
    return ids
  }, [tree])

  const toggleNode = React.useCallback((id: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = React.useCallback(() => {
    setCollapsedNodes(new Set())
  }, [])

  const collapseAll = React.useCallback(() => {
    setCollapsedNodes(new Set(allNodeIds))
  }, [allNodeIds])

  // Track previous enabled state
  const prevEnabledRef = React.useRef(enabled)

  React.useEffect(() => {
    const wasEnabled = prevEnabledRef.current
    prevEnabledRef.current = enabled

    if (!initializedRef.current && enabled && tree.length > 0) {
      initializedRef.current = true
      if (defaultCollapsed) {
        setCollapsedNodes(new Set(allNodeIds))
      }
      return
    }

    if (enabled && !wasEnabled && tree.length > 0) {
      if (defaultCollapsed) {
        setCollapsedNodes(new Set(allNodeIds))
      } else {
        setCollapsedNodes(new Set())
      }
    } else if (!enabled && wasEnabled) {
      setCollapsedNodes(new Set())
    }
  }, [enabled, tree, allNodeIds, defaultCollapsed])

  return {
    tree,
    collapsedNodes,
    toggleNode,
    expandAll,
    collapseAll,
  }
}

/**
 * Hook for flat grouping by any field value.
 * Returns DepartmentTreeGroup<T>[] for compatibility with GroupSection/GroupHeaderRow.
 */
export function useGroupByField<T>(
  items: T[],
  getGroupKey: (item: T) => string | null,
  enabled: boolean,
  options: UseGroupByDepartmentTreeOptions = {},
  getGroupLabel?: (groupKey: string | null, level: number, firstRowInGroup?: T) => string | null
): UseGroupByDepartmentTreeResult<T> {
  const { defaultCollapsed = true } = options
  const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set())
  const initializedRef = React.useRef(false)

  const tree = React.useMemo(() => {
    if (!enabled) return []

    const groupMap = new Map<string, T[]>()
    const noGroupItems: T[] = []

    for (const item of items) {
      const key = getGroupKey(item)
      if (!key) {
        noGroupItems.push(item)
        continue
      }
      const arr = groupMap.get(key) || []
      arr.push(item)
      groupMap.set(key, arr)
    }

    const groups: DepartmentTreeGroup<T>[] = Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, "ru"))
      .map(([key, groupItems]) => ({
        departmentId: key,
        departmentName: getGroupLabel ? (getGroupLabel(key, 0, groupItems[0]) ?? key) : key,
        level: 0,
        managerNames: [],
        items: groupItems,
        totalCount: groupItems.length,
        children: [],
      }))

    if (noGroupItems.length > 0) {
      groups.push({
        departmentId: "__no_group__",
        departmentName: "Без группы",
        level: 0,
        managerNames: [],
        items: noGroupItems,
        totalCount: noGroupItems.length,
        children: [],
      })
    }

    return groups
  }, [items, getGroupKey, enabled, getGroupLabel])

  const allNodeIds = React.useMemo(() => tree.map(g => g.departmentId), [tree])

  const toggleNode = React.useCallback((id: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = React.useCallback(() => {
    setCollapsedNodes(new Set())
  }, [])

  const collapseAll = React.useCallback(() => {
    setCollapsedNodes(new Set(allNodeIds))
  }, [allNodeIds])

  const prevEnabledRef = React.useRef(enabled)

  React.useEffect(() => {
    const wasEnabled = prevEnabledRef.current
    prevEnabledRef.current = enabled

    if (!initializedRef.current && enabled && tree.length > 0) {
      initializedRef.current = true
      if (defaultCollapsed) {
        setCollapsedNodes(new Set(allNodeIds))
      }
      return
    }

    if (enabled && !wasEnabled && tree.length > 0) {
      if (defaultCollapsed) {
        setCollapsedNodes(new Set(allNodeIds))
      } else {
        setCollapsedNodes(new Set())
      }
    } else if (!enabled && wasEnabled) {
      setCollapsedNodes(new Set())
    }
  }, [enabled, tree, allNodeIds, defaultCollapsed])

  return {
    tree,
    collapsedNodes,
    toggleNode,
    expandAll,
    collapseAll,
  }
}

/**
 * Hook for multi-field hierarchical grouping.
 * Groups items by multiple fields creating nested tree structure.
 * Example: fields = ["city", "department", "team"] creates 3-level hierarchy.
 */
export function useGroupByMultiField<T>(
  items: T[],
  getGroupKeys: ((item: T) => string | null)[],
  enabled: boolean,
  options: UseGroupByDepartmentTreeOptions = {},
  getGroupLabel?: (groupKey: string | null, level: number, firstRowInGroup?: T) => string | null
): UseGroupByDepartmentTreeResult<T> {
  const { defaultCollapsed = true } = options
  const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set())
  const initializedRef = React.useRef(false)

  const tree = React.useMemo(() => {
    if (!enabled || getGroupKeys.length === 0) return []

    type TreeNode = {
      id: string
      name: string
      level: number
      items: T[]
      children: TreeNode[]
      totalCount: number
    }

    // Recursive function to build nested groups
    const buildLevel = (
      levelItems: T[],
      level: number,
      pathPrefix: string
    ): TreeNode[] => {
      if (level >= getGroupKeys.length) {
        return []
      }

      const groupMap = new Map<string, T[]>()
      const noGroupItems: T[] = []

      for (const item of levelItems) {
        const key = getGroupKeys[level](item)
        if (!key) {
          noGroupItems.push(item)
          continue
        }
        const arr = groupMap.get(key) || []
        arr.push(item)
        groupMap.set(key, arr)
      }

      const nodes: TreeNode[] = Array.from(groupMap.entries())
        .sort(([a], [b]) => a.localeCompare(b, "ru"))
        .map(([key, groupItems]) => {
          const nodeId = pathPrefix ? `${pathPrefix}/${key}` : key
          const children = buildLevel(groupItems, level + 1, nodeId)

          // Compute totalCount: own items + all descendants
          const childrenCount = children.reduce((sum, child) => sum + child.totalCount, 0)
          const totalCount = groupItems.length + childrenCount

          return {
            id: nodeId,
            name: getGroupLabel ? (getGroupLabel(key, level, groupItems[0]) ?? key) : key,
            level,
            items: groupItems,
            children,
            totalCount,
          }
        })

      if (noGroupItems.length > 0 && level === 0) {
        nodes.push({
          id: "__no_group__",
          name: "Без группы",
          level,
          items: noGroupItems,
          children: [],
          totalCount: noGroupItems.length,
        })
      }

      return nodes
    }

    const nodes = buildLevel(items, 0, "")

    // Convert to DepartmentTreeGroup format
    const toTreeGroup = (node: TreeNode): DepartmentTreeGroup<T> => ({
      departmentId: node.id,
      departmentName: node.name,
      level: node.level,
      managerNames: [],
      items: node.items,
      totalCount: node.totalCount,
      children: node.children.map(toTreeGroup),
    })

    return nodes.map(toTreeGroup)
  }, [items, getGroupKeys, enabled, getGroupLabel])

  // Collect all node IDs recursively
  const allNodeIds = React.useMemo(() => {
    const ids: string[] = []
    const collect = (nodes: DepartmentTreeGroup<T>[]) => {
      for (const node of nodes) {
        ids.push(node.departmentId)
        collect(node.children)
      }
    }
    collect(tree)
    return ids
  }, [tree])

  const toggleNode = React.useCallback((id: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = React.useCallback(() => {
    setCollapsedNodes(new Set())
  }, [])

  const collapseAll = React.useCallback(() => {
    setCollapsedNodes(new Set(allNodeIds))
  }, [allNodeIds])

  const prevEnabledRef = React.useRef(enabled)

  React.useEffect(() => {
    const wasEnabled = prevEnabledRef.current
    prevEnabledRef.current = enabled

    if (!initializedRef.current && enabled && tree.length > 0) {
      initializedRef.current = true
      if (defaultCollapsed) {
        setCollapsedNodes(new Set(allNodeIds))
      }
      return
    }

    if (enabled && !wasEnabled && tree.length > 0) {
      if (defaultCollapsed) {
        setCollapsedNodes(new Set(allNodeIds))
      } else {
        setCollapsedNodes(new Set())
      }
    } else if (!enabled && wasEnabled) {
      setCollapsedNodes(new Set())
    }
  }, [enabled, tree, allNodeIds, defaultCollapsed])

  return {
    tree,
    collapsedNodes,
    toggleNode,
    expandAll,
    collapseAll,
  }
}
