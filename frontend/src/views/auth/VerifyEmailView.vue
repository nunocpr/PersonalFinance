<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import client from "@/services/api/client";

const route = useRoute();
const router = useRouter();

const status = ref<"ok"|"error"|"pending">("pending");
const message = ref("");

onMounted(async () => {
  const uid = route.query.uid as string | undefined;
  const token = route.query.token as string | undefined;

  if (!uid || !token) {
    status.value = "error";
    message.value = "Invalid verification link.";
    return;
  }

  try {
    await client.post("/auth/verify-email", { uid, token }); // POST, not GET
    status.value = "ok";
    message.value = "Email verified! You can now log in.";
  } catch (e: any) {
    status.value = "error";
    message.value = e?.response?.data?.message ?? "Verification failed.";
  }
});
</script>

<template>
  <main class="min-h-screen grid place-items-center p-6">
    <div class="max-w-md w-full text-center space-y-3">
      <h1 class="text-3xl font-heading">Email verification</h1>
      <p v-if="status==='pending'">Verifying...</p>
      <p v-else-if="status==='ok'" class="text-green-600">{{ message }}</p>
      <p v-else class="text-red-600">{{ message }}</p>
      <router-link class="underline" to="/login">Go to login</router-link>
    </div>
  </main>
</template>
