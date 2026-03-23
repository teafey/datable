"use server"

import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { randomBytes } from "crypto"

// ============== Types ==============

export interface Invitation {
  id: string
  userId: string | null
  userName: string | null
  email: string
  roleId: string
  roleName: string
  token: string
  status: "pending" | "accepted" | "expired" | "revoked"
  expiresAt: string
  createdAt: string
  createdByName: string | null
}

export interface CreateInvitationInput {
  email: string
  roleId: string
  userId?: string // Optional: pre-link to existing user record
  expiresInDays?: number // Default 7
}

export interface InvitationDetails {
  id: string
  email: string
  roleName: string
  userName: string | null
}

// ============== Create Invitation ==============

export async function createInvitation(
  input: CreateInvitationInput,
  createdByUserId: string
): Promise<{
  success: boolean
  error?: string
  invitation?: { id: string; token: string }
}> {
  // Check for existing pending invitation with same email
  const { data: existingInvite } = await supabaseAdmin
    .from("invitations")
    .select("id")
    .eq("email", input.email.toLowerCase().trim())
    .eq("status", "pending")
    .single()

  if (existingInvite) {
    return {
      success: false,
      error: "An active invitation already exists for this email",
    }
  }

  const token = randomBytes(32).toString("hex")

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 7))

  const { data: invitation, error: createError } = await supabaseAdmin
    .from("invitations")
    .insert({
      user_id: input.userId || null,
      email: input.email.toLowerCase().trim(),
      role_id: input.roleId,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: createdByUserId,
    })
    .select("id, token")
    .single()

  if (createError) {
    console.error("Error creating invitation:", createError)
    return { success: false, error: createError.message }
  }

  revalidatePath("/admin")
  return {
    success: true,
    invitation: { id: invitation.id, token: invitation.token },
  }
}

// ============== Get Invitations ==============

export async function getInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabaseAdmin
    .from("invitations")
    .select(
      `
      id,
      user_id,
      email,
      role_id,
      token,
      status,
      expires_at,
      created_at,
      user:users!invitations_user_id_fkey (full_name),
      role:roles!invitations_role_id_fkey (role_name),
      creator:users!invitations_created_by_fkey (full_name)
    `
    )
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching invitations:", error)
    return []
  }

  return (data || []).map((inv) => ({
    id: inv.id,
    userId: inv.user_id,
    userName:
      (inv.user as unknown as { full_name: string } | null)?.full_name || null,
    email: inv.email,
    roleId: inv.role_id,
    roleName:
      (inv.role as unknown as { role_name: string } | null)?.role_name ||
      "Unknown",
    token: inv.token,
    status: inv.status as Invitation["status"],
    expiresAt: inv.expires_at,
    createdAt: inv.created_at,
    createdByName:
      (inv.creator as unknown as { full_name: string } | null)?.full_name ||
      null,
  }))
}

// ============== Revoke Invitation ==============

export async function revokeInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("status", "pending")

  if (error) {
    console.error("Error revoking invitation:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

// ============== Validate Token (public) ==============

export async function validateInvitationToken(token: string): Promise<{
  valid: boolean
  invitation?: InvitationDetails
  error?: string
}> {
  const { data: invitation, error } = await supabaseAdmin
    .from("invitations")
    .select(
      `
      id,
      email,
      expires_at,
      status,
      user:users!invitations_user_id_fkey (full_name),
      role:roles!invitations_role_id_fkey (role_name)
    `
    )
    .eq("token", token)
    .single()

  if (error || !invitation) {
    return { valid: false, error: "Invitation not found" }
  }

  if (invitation.status !== "pending") {
    const statusMessages: Record<string, string> = {
      accepted: "Invitation already used",
      expired: "Invitation expired",
      revoked: "Invitation revoked",
    }
    return {
      valid: false,
      error: statusMessages[invitation.status] || "Invitation invalid",
    }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await supabaseAdmin
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id)

    return { valid: false, error: "Invitation expired" }
  }

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      roleName:
        (invitation.role as unknown as { role_name: string } | null)
          ?.role_name || "Unknown",
      userName:
        (invitation.user as unknown as { full_name: string } | null)
          ?.full_name || null,
    },
  }
}

// ============== Process Acceptance (after OAuth or SignUp) ==============

export async function processInvitationAcceptance(
  token: string,
  authUserId: string,
  authEmail: string
): Promise<{ success: boolean; error?: string }> {
  const { data: invitation, error: invError } = await supabaseAdmin
    .from("invitations")
    .select("id, user_id, email, role_id, status, expires_at")
    .eq("token", token)
    .single()

  if (invError || !invitation) {
    return { success: false, error: "Invitation not found" }
  }

  if (invitation.status !== "pending") {
    return { success: false, error: "Invitation already used or revoked" }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { success: false, error: "Invitation expired" }
  }

  if (invitation.email.toLowerCase() !== authEmail.toLowerCase()) {
    return {
      success: false,
      error: `Email mismatch. Expected: ${invitation.email}`,
    }
  }

  // Check if auth_user_id already linked to another user
  const { data: existingLink } = await supabaseAdmin
    .from("users")
    .select("id, full_name")
    .eq("auth_user_id", authUserId)
    .single()

  if (existingLink) {
    return {
      success: false,
      error: `This account is already linked to user: ${existingLink.full_name}`,
    }
  }

  // If invitation has a pre-linked user, update their auth_user_id
  if (invitation.user_id) {
    const { error: linkError } = await supabaseAdmin
      .from("users")
      .update({ auth_user_id: authUserId })
      .eq("id", invitation.user_id)

    if (linkError) {
      console.error("Error linking auth user:", linkError)
      return { success: false, error: "Error linking account" }
    }

    // Assign role
    await supabaseAdmin.from("user_roles").insert({
      user_id: invitation.user_id,
      role_id: invitation.role_id,
    })
  } else {
    // Create new user record
    const { data: newUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        auth_user_id: authUserId,
        email: authEmail.toLowerCase(),
        full_name: authEmail.split("@")[0], // Placeholder, can be updated later
      })
      .select("id")
      .single()

    if (createError || !newUser) {
      console.error("Error creating user:", createError)
      return { success: false, error: "Error creating user" }
    }

    // Assign role
    await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.id,
      role_id: invitation.role_id,
    })
  }

  // Mark invitation as accepted
  await supabaseAdmin
    .from("invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invitation.id)

  revalidatePath("/admin")
  return { success: true }
}

// ============== Sign Up with Invitation ==============

export async function signUpWithInvitation(
  token: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const validation = await validateInvitationToken(token)
  if (!validation.valid || !validation.invitation) {
    return { success: false, error: validation.error || "Invalid invitation" }
  }

  const { data: invitation } = await supabaseAdmin
    .from("invitations")
    .select("id, user_id, email, role_id")
    .eq("token", token)
    .single()

  if (!invitation) {
    return { success: false, error: "Invitation not found" }
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true,
    })

  if (authError) {
    if (authError.message.includes("already registered")) {
      return { success: false, error: "User with this email already exists" }
    }
    return { success: false, error: authError.message }
  }

  if (!authData.user) {
    return { success: false, error: "Error creating user" }
  }

  return processInvitationAcceptance(token, authData.user.id, invitation.email)
}

// ============== Resend (extend expiry) ==============

export async function resendInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string; newToken?: string }> {
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { error } = await supabaseAdmin
    .from("invitations")
    .update({
      token,
      expires_at: expiresAt.toISOString(),
      status: "pending",
    })
    .eq("id", invitationId)

  if (error) {
    console.error("Error resending invitation:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true, newToken: token }
}
