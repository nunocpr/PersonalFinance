<template>
  <div class="accounts-list">
    <div class="header">
      <h2>Your Accounts</h2>
      <button @click="openCreateModal" class="btn-add">
        <i class="fas fa-plus"></i> Add Account
      </button>
    </div>

    <div v-if="loading" class="loading">Loading accounts...</div>
    
    <div v-else-if="error" class="error">
      <i class="fas fa-exclamation-triangle"></i> {{ error }}
    </div>
    
    <div v-else-if="accounts.length === 0" class="empty">
      <i class="fas fa-piggy-bank"></i> No accounts found. Create your first account!
    </div>
    
    <div v-else class="accounts-container">
      <div v-for="account in accounts" :key="account.id" class="account-card">
        <div class="account-header">
          <div class="account-name">{{ account.name }}</div>
          <div class="account-type">{{ formatAccountType(account.type) }}</div>
        </div>
        
        <div class="account-balance">
          {{ formatCurrency(account.balance) }}
        </div>
        
        <div class="account-description" v-if="account.description">
          {{ account.description }}
        </div>
        
        <div class="account-actions">
          <button @click="openEditModal(account)" class="btn-edit">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button @click="viewTransactions(account.id)" class="btn-view">
            <i class="fas fa-list"></i> Transactions
          </button>
          <button @click="confirmDelete(account)" class="btn-delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <AccountModal
      v-if="showModal"
      :account="currentAccount"
      :mode="modalMode"
      @close="closeModal"
      @save="handleSaveAccount"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router'; 
import { AccountService } from '@/services/accounts/accounts.service';
import type { Account, CreateAccountDto, UpdateAccountDto } from '@/types/accounts';
import AccountModal from '@/components/AccountModal.vue';

const router = useRouter();
const accounts = ref<Account[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const currentAccount = ref<Account | null>(null);

onMounted(async () => {
  await fetchAccounts();
});

async function fetchAccounts() {
  try {
    loading.value = true;
    accounts.value = await AccountService.getAll();
    error.value = null;
  } catch (err) {
    console.error('Failed to fetch accounts:', err);
    error.value = 'Failed to load accounts. Please try again later.';
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  modalMode.value = 'create';
  currentAccount.value = null;
  showModal.value = true;
}

function openEditModal(account: Account) {
  modalMode.value = 'edit';
  currentAccount.value = { ...account };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

async function handleSaveAccount(accountData: CreateAccountDto | UpdateAccountDto) {
  try {
    if (modalMode.value === 'create') {
      const newAccount = await AccountService.create(accountData as CreateAccountDto);
      accounts.value.unshift(newAccount);
    } else if (currentAccount.value) {
      const updatedAccount = await AccountService.update(
        currentAccount.value.id,
        accountData as UpdateAccountDto
      );
      const index = accounts.value.findIndex(a => a.id === updatedAccount.id);
      if (index !== -1) {
        accounts.value.splice(index, 1, updatedAccount);
      }
    }
    closeModal();
  } catch (err) {
    console.error('Failed to save account:', err);
    alert('Failed to save account. Please try again.');
  }
}

function confirmDelete(account: Account) {
  if (confirm(`Are you sure you want to delete "${account.name}"? This cannot be undone.`)) {
    deleteAccount(account.id);
  }
}

async function deleteAccount(id: number) {
  try {
    await AccountService.delete(id);
    accounts.value = accounts.value.filter(account => account.id !== id);
  } catch (err) {
    console.error('Failed to delete account:', err);
    alert('Failed to delete account. Please try again.');
  }
}

function viewTransactions(accountId: number) {
  router.push({ name: 'transactions', query: { accountId } });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount / 100);
}

function formatAccountType(type: string): string {
  const typeMap: Record<string, string> = {
    checking: 'Checking',
    savings: 'Savings',
    credit: 'Credit Card',
    investment: 'Investment',
    other: 'Other'
  };
  return typeMap[type] || type;
}
</script>

<style scoped>
.accounts-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-add {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-add:hover {
  background-color: #359a6b;
}

.loading, .error, .empty {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.error {
  color: #e74c3c;
}

.empty {
  color: #3498db;
}

.accounts-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.account-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: transform 0.2s;
  border-left: 4px solid #42b983;
}

.account-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.account-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.account-name {
  font-weight: bold;
  font-size: 18px;
}

.account-type {
  background: #f0f7ff;
  color: #3498db;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.account-balance {
  font-size: 24px;
  font-weight: bold;
  margin: 10px 0;
  color: #2c3e50;
}

.account-description {
  color: #7f8c8d;
  margin-bottom: 15px;
  font-size: 14px;
}

.account-actions {
  display: flex;
  gap: 10px;
}

.btn-edit, .btn-view, .btn-delete {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.btn-edit {
  background-color: #f1c40f;
  color: #2c3e50;
}

.btn-view {
  background-color: #3498db;
  color: white;
}

.btn-delete {
  background-color: #e74c3c;
  color: white;
  flex: 0;
  width: 40px;
}

.btn-edit:hover, .btn-view:hover, .btn-delete:hover {
  opacity: 0.9;
}
</style>