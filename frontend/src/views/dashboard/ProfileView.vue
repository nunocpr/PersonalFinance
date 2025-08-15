<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "@/services/auth/auth.store";
import { updateMyName, changeMyPassword } from "@/services/users/user.service";

const { user, setSession } = useAuth();

const name = ref(user.value?.name ?? "");
const savingName = ref(false);
const nameMsg = ref(""); const nameErr = ref("");

async function saveName() {
  try {
    savingName.value = true; nameMsg.value = ""; nameErr.value = "";
    const { user: updated } = await updateMyName(name.value);
    setSession(updated);
    nameMsg.value = "Name updated.";
  } catch (e: any) {
    nameErr.value = e?.response?.data?.message ?? "Update failed";
  } finally { savingName.value = false; }
}

const current_password = ref(""); const new_password = ref("");
const savingPwd = ref(false); const pwdMsg = ref(""); const pwdErr = ref("");

async function savePassword() {
  try {
    savingPwd.value = true; pwdMsg.value = ""; pwdErr.value = "";
    await changeMyPassword({ current_password: current_password.value, new_password: new_password.value });
    pwdMsg.value = "Password changed.";
    current_password.value = ""; new_password.value = "";
  } catch (e: any) {
    pwdErr.value = e?.response?.data?.message ?? "Update failed";
  } finally { savingPwd.value = false; }
}
</script>

<template>
  <div class="grid md:grid-cols-2 gap-8">
    <section class="bg-white rounded-2xl p-6 shadow-sm border">
      <h2 class="font-heading text-xl mb-4">Profile</h2>
      <div class="space-y-3">
        <label class="block text-sm text-gray-600">Display name</label>
        <input v-model="name" class="w-full border rounded px-3 py-2" />
        <button class="px-4 py-2 rounded bg-black text-white" :disabled="savingName" @click="saveName">
          {{ savingName ? "Saving..." : "Save" }}
        </button>
        <p v-if="nameMsg" class="text-green-600 text-sm">{{ nameMsg }}</p>
        <p v-if="nameErr" class="text-red-600 text-sm">{{ nameErr }}</p>
      </div>
    </section>

    <section class="bg-white rounded-2xl p-6 shadow-sm border">
      <h2 class="font-heading text-xl mb-4">Change password</h2>
      <div class="space-y-3">
        <label class="block text-sm text-gray-600">Current password</label>
        <input v-model="current_password" type="password" class="w-full border rounded px-3 py-2" />
        <label class="block text-sm text-gray-600">New password</label>
        <input v-model="new_password" type="password" class="w-full border rounded px-3 py-2" />
        <button class="px-4 py-2 rounded bg-black text-white" :disabled="savingPwd" @click="savePassword">
          {{ savingPwd ? "Updating..." : "Update password" }}
        </button>
        <p v-if="pwdMsg" class="text-green-600 text-sm">{{ pwdMsg }}</p>
        <p v-if="pwdErr" class="text-red-600 text-sm">{{ pwdErr }}</p>
      </div>
    </section>
  </div>
</template>
