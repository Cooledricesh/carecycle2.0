// Test Supabase connection
const testSupabase = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/items');
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 500) {
      console.log('\n❌ Supabase connection failed');
      console.log('Check your .env.local for correct keys');
    } else if (response.status === 200) {
      console.log('\n✅ Supabase connection successful');
      console.log(`Found ${data.length || 0} items`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

testSupabase();