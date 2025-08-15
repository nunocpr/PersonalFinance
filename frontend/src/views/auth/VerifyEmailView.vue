<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { verifyEmail, resendVerification } from "@/services/auth/auth.service";

const route = useRoute();
const router = useRouter();

const status = ref<"idle"|"ok"|"error">("idle");
const msg = ref("");

onMounted(async () => {
  const uid   = String(route.query.uid || "");
  const token = String(route.query.token || "");
  if (!uid || !token) { status.value = "error"; return; }

  try {
    const r = await verifyEmail(uid, token); // <-- POST
    status.value = "ok";
    msg.value = r.message ?? "Email verified. You can now log in.";
  } catch {
    status.value = "error";
    msg.value = "Verification failed. Link may be invalid or expired.";
  }
});

async function doResend(email: string) {
  await resendVerification(email);
}
function goLogin() { router.replace({ name: "auth-login" }); }
</script>

<template>
  <main class="grid place-items-center min-h-screen">
    <div class="w-[520px] max-w-[90vw] p-6 rounded border bg-white">
      <h2 class="text-xl font-heading mb-3">Verify Email</h2>

      <p v-if="status==='ok'" class="text-green-600 mb-4">{{ msg }}</p>
      <p v-else-if="status==='error'" class="text-red-600 mb-4">{{ msg }}</p>
      <p v-else>Verifying…</p>

      <div class="mt-4 flex gap-2" v-if="status!=='idle'">
        <button class="px-3 py-1 rounded bg-black text-white" @click="goLogin">Back to login</button>
      </div>
    </div>
  </main>
</template>
