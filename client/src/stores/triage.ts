import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api';
import { useIntakeStore } from './intake';

export const useTriageStore = defineStore('triage', () => {
    const intakeStore = useIntakeStore();

    const triageData = ref({
        ontarioResidency: null as boolean | null,
        maritalStatus: '' as string,
        hasMinors: null as boolean | null,
        hasDisabledDependants: null as boolean | null,
        hasBusiness: null as boolean | null,
        hasForeignAssets: null as boolean | null,
    });

    const setTriageAnswer = (key: keyof typeof triageData.value, value: any) => {
        (triageData.value as any)[key] = value;
    };

    const submitTriage = async () => {
        try {
            const response = await api.post('/triage/submit', {
                triageData: triageData.value,
            });

            // Initialize Intake State
            intakeStore.setIntakeId(response.data.intakeId);

            return true;
        } catch (error) {
            console.error('Submission failed:', error);
            throw error;
        }
    };

    return {
        triageData,
        setTriageAnswer,
        submitTriage
    };
});
