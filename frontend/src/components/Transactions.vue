<template>
  <div class="transactions-view">
    <h1>Transactions</h1>
    
    <!-- Transaction Form -->
    <form @submit.prevent="handleSubmit" class="transaction-form">
      <div class="form-group">
        <label>Date</label>
        <input 
          v-model="formData.transaction_date" 
          type="date" 
          required 
        />
      </div>
      
      <div class="form-group">
        <label>Description</label>
        <input 
          v-model="formData.transaction_description" 
          placeholder="What was this for?" 
          required 
        />
      </div>
      
      <div class="form-group">
        <label>Amount (€)</label>
        <input
          v-model.number="formData.transaction_amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          required
          @change="convertToCents"
        />
      </div>
      
      <div class="form-group">
        <label>Account</label>
        <select v-model="formData.transaction_account_id" required>
          <option v-for="account in accounts" :value="account.account_id" :key="account.account_id">
            {{ account.account_name }}
          </option>
        </select>
      </div>
      
      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Processing...' : 'Add Transaction' }}
      </button>
      
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </form>
    
    <!-- Transactions List -->
    <div class="transactions-list">
      <div v-if="isLoading">Loading transactions...</div>
      <div v-else-if="transactions.length === 0">No transactions found</div>
      <ul v-else>
        <li v-for="tx in transactions" :key="tx.transaction_id" class="transaction-item">
          <div class="tx-date">{{ formatDate(tx.transaction_date) }}</div>
          <div class="tx-description">{{ tx.transaction_description }}</div>
          <div class="tx-amount" :class="{ 'negative': tx.transaction_amount < 0 }">
            {{ formatCurrency(tx.transaction_amount) }}
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Transaction } from '@/types/transactions';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Reactive data
const transactions = ref<Transaction[]>([]);
const accounts = ref<{account_id: number, account_name: string}[]>([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');

const formData = ref({
  transaction_date: new Date().toISOString().split('T')[0],
  transaction_description: '',
  transaction_amount: 0, // in euros
  transaction_amount_cents: 0, // will be sent to API
  transaction_account_id: 1, // default account
  transaction_is_saving: false
});

// Convert euros to cents for API
const convertToCents = () => {
  formData.value.transaction_amount_cents = Math.round(
    formData.value.transaction_amount * 100
  );
};

// Fetch initial data
const fetchData = async () => {
  try {
    isLoading.value = true;
    const [txRes, accRes] = await Promise.all([
      fetch(`${apiBaseUrl}/transactions`),
      fetch(`${apiBaseUrl}/accounts`)
    ]);
    
    if (!txRes.ok || !accRes.ok) throw new Error('Failed to fetch data');
    
    transactions.value = await txRes.json();
    accounts.value = await accRes.json();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unknown error occurred';
  } finally {
    isLoading.value = false;
  }
};

// Handle form submission
const handleSubmit = async () => {
  try {
    isSubmitting.value = true;
    errorMessage.value = '';
    
    const response = await fetch(`${apiBaseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData.value,
        transaction_amount: formData.value.transaction_amount_cents
      })
    });
    
    if (!response.ok) throw new Error('Failed to add transaction');
    
    const newTransaction = await response.json();
    transactions.value.unshift(newTransaction);
    
    // Reset form (keep account selection)
    formData.value = {
      ...formData.value,
      transaction_description: '',
      transaction_amount: 0,
      transaction_amount_cents: 0,
      transaction_is_saving: false
    };
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Submission failed';
  } finally {
    isSubmitting.value = false;
  }
};

// Formatting helpers
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR'
  }).format(cents / 100);
};

// Fetch data on component mount
onMounted(fetchData);
</script>

<style scoped>
.transaction-form {
  max-width: 500px;
  margin: 2rem auto;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background-color: #42b983;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
}

.error-message {
  color: #ff4444;
  margin-top: 1rem;
}

.transactions-list {
  margin-top: 2rem;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}

.tx-amount.negative {
  color: #ff4444;
}
</style>