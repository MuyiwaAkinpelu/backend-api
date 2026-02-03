async function verify() {
    const API_URL = 'http://localhost:3000/api';

    try {
        console.log('Logging in as admin...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@scidar.com',
                password: 'password123',
            }),
        });
        const loginData = await loginRes.json() as any;

        const token = loginData.data.accessToken;
        console.log('Token acquired. Fetching all activity logs...');

        const logsRes = await fetch(`${API_URL}/activity-logs/all`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const logsData = await logsRes.json() as any;

        if (logsData.success && Array.isArray(logsData.data)) {
            console.log('Successfully fetched logs!');
            console.log('Count:', logsData.data.length);
            console.log('First log:', JSON.stringify(logsData.data[0], null, 2));
        } else {
            console.error('Failed to fetch logs or data format is incorrect.');
            console.error('Response:', JSON.stringify(logsData, null, 2));
        }
    } catch (error: any) {
        console.error('Verification failed:', error.message);
    }
}

verify();
