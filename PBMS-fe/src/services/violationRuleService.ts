import { ViolationRule } from '../app/components/admin/CardViolationRules';
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5173/api/v1';

class ViolationRuleService {
    async getAllRules(): Promise<ViolationRule[]> {
        const token = authService.getToken();
        const response = await fetch(`${API_URL}/violation-rules`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Lỗi khi lấy danh sách luật vi phạm');
        }
        return response.json();
    }

    async updateRule(ruleId: string, rule: ViolationRule): Promise<ViolationRule> {
        const token = authService.getToken();
        const response = await fetch(`${API_URL}/violation-rules/${ruleId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rule)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Lỗi khi cập nhật luật vi phạm');
        }
        return response.json();
    }
}

export default new ViolationRuleService();
