// src/services/profileService.ts
import { supabase } from "@/lib/supabaseClient";

export async function fetchMyProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,avatar_url")
    .eq("id", userId)
    .single();
  if (error) throw error;

  // 활동 시각 갱신(성공/실패 무시)
  supabase
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", userId);
  return data;
}
