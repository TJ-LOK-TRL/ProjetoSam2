<template>
    <div class="single-toggle-card-container" @click="toggle">
        <i :class="iconClass"></i>
    </div>
</template>

<script setup>
    import { computed, ref } from 'vue'

    const props = defineProps({
        modelValue: { type: [Boolean, String, Number], required: true },
        iconOn: { type: String, required: true },
        iconOff: { type: String, required: true },
        state: { type: Boolean, required: true },
        stateValue: { type: [Boolean, String, Number], required: true }
    })

    const prevValue = ref(props.modelValue)

    const emit = defineEmits(['update:modelValue'])

    const isOn = computed(() => (props.modelValue === props.stateValue) === props.state)

    const iconClass = computed(() => isOn.value ? props.iconOn : props.iconOff)

    function toggle() {
        const newValue = !isOn.value ? prevValue.value : props.stateValue
        prevValue.value = props.modelValue
        emit('update:modelValue', newValue)
    }
</script>

<style scoped>
    .single-toggle-card-container {
        display: flex;
        justify-content: center;
        align-items: center;
        border: 1px solid #ddd;
        border-radius: 8px;
        width: 100%;
        height: 100%;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 0.5rem;
        transition: background 0.2s ease;
    }

    .single-toggle-card-container:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }
</style>