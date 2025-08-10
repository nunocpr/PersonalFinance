<script setup lang="ts">
import { useAuth } from "@/services/auth/auth.store";
import { wlog } from "@/utils/wlog";
const { user, clearSession } = useAuth();
wlog("User:", user.value);
</script>

<template>
  <section style="padding:1rem">
    <h2>Dashboard</h2>
    <p>Welcome, {{ user?.user_name || user?.user_email }}!</p>
    <button @click="clearSession()">Logout</button>
  </section>
</template>
