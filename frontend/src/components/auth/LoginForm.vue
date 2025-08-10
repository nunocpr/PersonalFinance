<script setup lang="ts">
import { reactive, ref } from "vue";
import { login, resendVerification } from "@/services/auth/auth.service";
import { useAuth } from "@/services/auth/auth.store";
import type { LoginDto } from "@/types/auth";
import { useRouter } from "vue-router";

const emit = defineEmits<{ (e: "switch"): void }>();
const router = useRouter();
const { setSession } = useAuth();

const form = reactive<LoginDto>({ email: "", password: "" });
const loading = ref(false);
const error = ref("");
const needsVerification = ref(false);

async function submit() {
  try {
    loading.value = true; error.value = ""; needsVerification.value = false;
    const res = await login(form);
    setSession(res.user);
    router.replace({ name: "dashboard" });
  } catch (e: any) {
    const status = e?.response?.status;
    const data = e?.response?.data;
    if (status === 403 && data?.needsVerification) {
      needsVerification.value = true;
      error.value = data?.message ?? "Please verify your email first.";
    } else {
      error.value = data?.message ?? "Login failed";
    }
  } finally { loading.value = false; }
}

async function resend() {
  try {
    await resendVerification(form.email);
    error.value = "Verification email resent. Check your inbox.";
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? "Could not resend verification.";
  }
}
</script>

<template>
  <form @submit.prevent="submit" class="max-w-sm w-full space-y-3">
    <h2 class="text-2xl font-heading">Login</h2>
    <input v-model="form.email" type="email" placeholder="Email" class="w-full border p-2 rounded" required />
    <input v-model="form.password" type="password" placeholder="Password" class="w-full border p-2 rounded" required />
    <button class="w-full bg-black text-white py-2 rounded" :disabled="loading">
      {{ loading ? "Logging in..." : "Login" }}
    </button>
    <p class="text-sm">
      No account?
      <a href="#" @click.prevent="emit('switch')" class="underline">Register</a>
    </p>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <button v-if="needsVerification" type="button" @click="resend" class="text-sm underline">
      Resend verification email
    </button>
    <p class="text-sm">
      <router-link to="/forgot-password" class="underline">Forgot password?</router-link>
    </p>
  </form>
</template>
