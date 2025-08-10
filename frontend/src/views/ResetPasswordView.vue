<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { resetPassword } from "@/services/auth/auth.service";

const route = useRoute();
const router = useRouter();

const uid = ref("");
const token = ref("");
const password = ref("");
const loading = ref(false);
const message = ref("");
const error = ref("");

onMounted(() => {
  uid.value = (route.query.uid as string) || "";
  token.value = (route.query.token as string) || "";
});

async function submit() {
  try {
    loading.value = true; message.value = ""; error.value = "";
    await resetPassword({ uid: uid.value, token: token.value, password: password.value });
    message.value = "Password updated. You can now log in.";
    setTimeout(() => router.replace({ name: "login" }), 1200);
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? "Reset failed";
  } finally { loading.value = false; }
}
</script>

<template>
  <main class="min-h-screen grid place-items-center p-6">
    <form @submit.prevent="submit" class="max-w-sm w-full space-y-3">
      <h1 class="text-2xl font-heading">Set a new password</h1>
      <input v-model="password" type="password" placeholder="New password" class="w-full border p-2 rounded" required />
      <button class="w-full bg-black text-white py-2 rounded" :disabled="loading || !uid || !token">
        {{ loading ? "Updating..." : "Update password" }}
      </button>
      <p v-if="message" class="text-green-600 text-sm">{{ message }}</p>
      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
    </form>
  </main>
</template>
