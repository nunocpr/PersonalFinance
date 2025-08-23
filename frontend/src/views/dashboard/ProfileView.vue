<script setup lang="ts">
defineOptions({ name: "ProfileView" });

import { ref } from "vue";
import { useAuth } from "@/services/auth/auth.store";
import { updateUserName, updateUserPassword } from "@/services/users/user.service";
import Button from "@/components/ui/Button.vue";

const { user, setSession } = useAuth();

const name = ref(user.value?.name ?? "");
const savingName = ref(false);
const nameMsg = ref(""); const nameErr = ref("");

async function saveName() {
    try {
        savingName.value = true; nameMsg.value = ""; nameErr.value = "";
        const { user: updated } = await updateUserName(name.value);
        setSession(updated);
        nameMsg.value = "Nome atualizado.";
    } catch (e: any) {
        nameErr.value = e?.response?.data?.message ?? "Falha ao atualizar o nome.";
    } finally { savingName.value = false; }
}

const current_password = ref(""); const new_password = ref("");
const savingPwd = ref(false); const pwdMsg = ref(""); const pwdErr = ref("");

async function savePassword() {
    try {
        savingPwd.value = true; pwdMsg.value = ""; pwdErr.value = "";
        await updateUserPassword({ current_password: current_password.value, new_password: new_password.value });
        pwdMsg.value = "Palavra-passe alterada.";
        current_password.value = ""; new_password.value = "";
    } catch (e: any) {
        pwdErr.value = e?.response?.data?.message ?? "Falha ao alterar a palavra-passe.";
    } finally { savingPwd.value = false; }
}
</script>

<template>
    <div class="grid md:grid-cols-3 gap-12 items-stretch mt-2 md:mt-6">
        <section class="bg-white rounded-md p-6 shadow-sm border flex flex-col">
            <h2 class="font-heading text-xl mb-4">Perfil</h2>
            <div class="space-y-3 flex flex-col flex-grow">
                <label class="block text-sm text-gray-600">Nome de apresentação</label>
                <input v-model="name" class="w-full border rounded px-3 py-2 max-w-96" />

                <!-- Spacer pushes button down -->
                <div class="flex-grow"></div>
                <Button variant="primary" size="md" title="Adicionar Regra" :disabled="savingName" @click="saveName"> {{
                    savingName ? "A guardar…" : "Guardar" }}</Button>
                <p v-if="nameMsg" class="text-green-600 text-sm">{{ nameMsg }}</p>
                <p v-if="nameErr" class="text-red-600 text-sm">{{ nameErr }}</p>
            </div>
        </section>

        <section class="bg-white rounded-md p-6 shadow-sm border flex flex-col">
            <h2 class="font-heading text-xl mb-4">Alterar palavra-passe</h2>
            <div class="space-y-3 flex flex-col flex-grow">
                <label class="block text-sm text-gray-600">Palavra-passe atual</label>
                <input v-model="current_password" type="password" class="w-full border rounded px-3 py-2 max-w-96" />
                <label class="block text-sm text-gray-600">Nova palavra-passe</label>
                <input v-model="new_password" type="password" class="w-full border rounded px-3 py-2 max-w-96" />

                <!-- Spacer pushes button down -->
                <div class="flex-grow"></div>

                <Button variant="primary" size="md" title="Adicionar Regra" :disabled="savingPwd"
                    @click="savePassword">{{ savingPwd ? "A atualizar…" : "Atualizar palavra-passe" }}</Button>
                <p v-if="pwdMsg" class="text-green-600 text-sm">{{ pwdMsg }}</p>
                <p v-if="pwdErr" class="text-red-600 text-sm">{{ pwdErr }}</p>
            </div>
        </section>
    </div>
</template>
