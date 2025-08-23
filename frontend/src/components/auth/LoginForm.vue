<script setup lang="ts">
import { reactive, ref } from "vue";
import { login, resendVerification } from "@/services/auth/auth.service";
import { useAuth } from "@/services/auth/auth.store";
import type { LoginDto } from "@/types/auth";
import { useRouter } from "vue-router";
import Button from "../ui/Button.vue";

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
        setSession(res);
        router.replace({ name: "dashboard" });
    } catch (e: any) {
        const status = e?.response?.status;
        const data = e?.response?.data;
        if (status === 403 && data?.needsVerification) {
            needsVerification.value = true;
            error.value = data?.message ?? "Por favor verifica o teu email primeiro.";
        } else {
            error.value = data?.message ?? "Falha no início de sessão.";
        }
    } finally { loading.value = false; }
}

async function resend() {
    try {
        await resendVerification(form.email);
        error.value = "Email de verificação reenviado. Verifica a tua caixa de entrada.";
    } catch (e: any) {
        error.value = e?.response?.data?.message ?? "Não foi possível reenviar a verificação.";
    }
}
</script>

<template>
    <form @submit.prevent="submit" class="max-w-sm w-full space-y-3">
        <h2 class="text-2xl font-heading">Iniciar sessão</h2>
        <input v-model="form.email" type="email" placeholder="Email" class="w-full border p-2 rounded" required />
        <input v-model="form.password" type="password" placeholder="Palavra-passe" class="w-full border p-2 rounded"
            required />
        <Button variant="primary" size="sm" title="Entrar" class="w-full" :disabled="loading" @click="submit">{{ loading
            ? "A entrar…" :
            "Entrar"
        }}</Button>
        <p class="text-sm">
            Não tens conta?
            <a href="#" @click.prevent="emit('switch')" class="underline">Registar</a>
        </p>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <Button v-if="needsVerification" variant="ghost" size="sm" title="Entrar" class="w-full" :disabled="loading"
            @click="submit">Reenviar email de verificação</Button>
        <p class="text-sm">
            <router-link to="/auth/forgot" class="underline">Esqueces-te da tua palavra-passe?</router-link>
        </p>
    </form>
</template>
