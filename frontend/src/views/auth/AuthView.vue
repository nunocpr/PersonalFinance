<script setup lang="ts">
import { ref } from "vue";
import LoginForm from "@/components/auth/LoginForm.vue";
import RegisterForm from "@/components/auth/RegisterForm.vue";

const mode = ref<"login" | "register">("login");
</script>

<template>
  <main style="min-height:100vh; display:grid; place-items:center;">
    <LoginForm v-if="mode==='login'" @switch="mode='register'" />
    <RegisterForm v-else @switch="mode='login'" />
  </main>
</template>
