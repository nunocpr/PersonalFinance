<script setup lang="ts">
import { ref } from "vue";
import { forgotPassword } from "@/services/auth/auth.service";

const email = ref("");
const loading = ref(false);
const message = ref("");
const error = ref("");

async function submit() {
  try {
    loading.value = true; message.value = ""; error.value = "";
    const res = await forgotPassword(email.value);
    message.value = res.message || "If that email exists, a reset link was sent.";
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? "Failed to send reset email";
  } finally { loading.value = false; }
}
</script>

<template>
  <main class="min-h-screen grid place-items-center p-6">
    <form @submit.prevent="submit" class="max-w-sm w-full space-y-3">
      <h1 class="text-2xl font-heading">Forgot password</h1>
      <input v-model="email" type="email" placeholder="Your email" class="w-full border p-2 rounded" required />
      <button class="w-full bg-black text-white py-2 rounded" :disabled="loading">
        {{ loading ? "Sending..." : "Send reset link" }}
      </button>
      <p v-if="message" class="text-green-600 text-sm">{{ message }}</p>
      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
    </form>
  </main>
</template>
