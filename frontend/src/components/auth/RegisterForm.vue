<script setup lang="ts">
import { reactive, ref } from "vue";
import { create } from "@/services/auth/auth.service";
import type { RegisterDto } from "@/types/auth";

const emit = defineEmits<{ (e: "switch"): void }>();

const form = reactive<RegisterDto>({ name: "", email: "", password: "" });
const loading = ref(false);
const msg = ref("");
const error = ref("");

async function submit() {
  try {
    loading.value = true; error.value = ""; msg.value = "";
    const res = await create(form);
    msg.value = res.message || "Registo efetuado. Verifica o teu email.";
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? "Falha no registo.";
  } finally { loading.value = false; }
}
</script>

<template>
  <form @submit.prevent="submit" class="max-w-sm w-full space-y-3">
    <h2 class="text-2xl font-heading">Registar</h2>
    <input v-model="form.name" placeholder="Nome" class="w-full border p-2 rounded" required />
    <input v-model="form.email" type="email" placeholder="Email" class="w-full border p-2 rounded" required />
    <input v-model="form.password" type="password" placeholder="Palavra-passe" class="w-full border p-2 rounded" required />
    <button class="w-full bg-black text-white py-2 rounded" :disabled="loading">
      {{ loading ? "A criar…" : "Criar conta" }}
    </button>
    <p class="text-sm">
      Já tens conta?
      <a href="#" @click.prevent="emit('switch')" class="underline">Iniciar sessão</a>
    </p>
    <p v-if="msg" class="text-green-600 text-sm">{{ msg }}</p>
    <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
  </form>
</template>
