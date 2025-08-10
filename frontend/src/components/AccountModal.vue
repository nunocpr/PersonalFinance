<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ mode === 'create' ? 'Create New Account' : 'Edit Account' }}</h3>
        <button class="close-btn" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label for="accountName">Account Name *</label>
          <input
            type="text"
            id="accountName"
            v-model="formData.name"
            placeholder="e.g., Chase Checking"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="accountType">Account Type *</label>
          <select id="accountType" v-model="formData.type" required>
            <option value="" disabled>Select account type</option>
            <option v-for="type in accountTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="accountBalance">Initial Balance</label>
          <div class="currency-input">
            <span class="currency-symbol">$</span>
            <input
              type="number"
              id="accountBalance"
              v-model.number="formData.balance"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label for="accountDescription">Description</label>
          <textarea
            id="accountDescription"
            v-model="formData.description"
            placeholder="Add any notes about this account"
            rows="3"
          ></textarea>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-cancel" @click="close">Cancel</button>
        <button class="btn-save" @click="save">{{ mode === 'create' ? 'Create Account' : 'Save Changes' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Account, CreateAccountDto, UpdateAccountDto } from '@/types/accounts';
import { accountTypes } from '@/types/accounts';

const props = defineProps({
  account: {
    type: Object as () => Account | null,
    default: null
  },
  mode: {
    type: String as () => 'create' | 'edit',
    default: 'create'
  }
});

const emit = defineEmits(['close', 'save']);

const formData = ref<CreateAccountDto | UpdateAccountDto>({
  name: '',
  type: '',
  balance: 0,
  description: ''
});

// When account prop changes (for edit mode)
watch(() => props.account, (newAccount) => {
  if (newAccount) {
    formData.value = {
      name: newAccount.name,
      type: newAccount.type,
      balance: newAccount.balance / 100,
      description: newAccount.description || ''
    };
  } else {
    resetForm();
  }
}, { immediate: true });

function resetForm() {
  formData.value = {
    name: '',
    type: '',
    balance: 0,
    description: ''
  };
}

function close() {
  emit('close');
}

function save() {
  if (!formData.value.name || !formData.value.type) {
    alert('Please fill in all required fields');
    return;
  }
  
  // Convert dollars to cents for backend
  const dataToSave = {
    ...formData.value,
    balance: formData.value.balance ? Math.round(formData.value.balance * 100) : 0
  };
  
  emit('save', dataToSave);
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #7f8c8d;
}

.close-btn:hover {
  color: #34495e;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-group textarea {
  resize: vertical;
}

.currency-input {
  position: relative;
}

.currency-input .currency-symbol {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  font-weight: bold;
  color: #7f8c8d;
}

.currency-input input {
  padding-left: 30px;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel, .btn-save {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-cancel {
  background: #f5f7fa;
  color: #7f8c8d;
}

.btn-cancel:hover {
  background: #e8eaed;
}

.btn-save {
  background: #42b983;
  color: white;
}

.btn-save:hover {
  background: #359a6b;
}
</style>