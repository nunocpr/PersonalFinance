<script setup lang="ts">
import { reactive, ref } from "vue";
import { register } from "@/services/auth/auth.service";
import type { RegisterDto } from "@/types/auth";

const emit = defineEmits<{ (e: "switch"): void }>();

const form = reactive<RegisterDto>({ name: "", email: "", password: "" });
const loading = ref(false);
const msg = ref("");
const error = ref("");

async function submit() {
  try {
    loading.value = true; error.value = ""; msg.value = "";
    const res = await register(form);
    msg.value = res.message || "Registration successful. Check your email.";
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? "Registration failed";
  } finally { loading.value = false; }
}
</script>

<template>
  <form @submit.prevent="submit" class="max-w-sm w-full space-y-3">
    <h2 class="text-2xl font-heading">Register</h2>
    <input v-model="form.name" placeholder="Name" class="w-full border p-2 rounded" required />
    <input v-model="form.email" type="email" placeholder="Email" class="w-full border p-2 rounded" required />
    <input v-model="form.password" type="password" placeholder="Password" class="w-full border p-2 rounded" required />
    <button class="w-full bg-black text-white py-2 rounded" :disabled="loading">
      {{ loading ? "Creating..." : "Create account" }}
    </button>
    <p class="text-sm">
      Have an account?
      <a href="#" @click.prevent="emit('switch')" class="underline">Login</a>
    </p>
    <p v-if="msg" class="text-green-600 text-sm">{{ msg }}</p>
    <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
  </form>
</template>
