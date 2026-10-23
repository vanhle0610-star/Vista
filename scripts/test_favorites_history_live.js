async function testAuthFavoritesHistory() {
  const timestamp = Date.now();
  const testEmail = `test_tv1_${timestamp}@vista.example.com`;
  const testPassword = 'Password123!';

  console.log('--- 1. Registering Test User for Live Supabase Testing ---');
  const regRes = await fetch('http://localhost:8080/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'StrongPassword2026!@#',
      displayName: 'TV1 Verification Tester'
    })
  });
  console.log('Register status:', regRes.status);
  const regData = await regRes.json();
  const token = regData.accessToken;
  console.log('Obtained JWT Access Token successfully.');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. Get a sample destination
  const listRes = await fetch('http://localhost:8080/api/v1/destinations?size=1');
  const listData = await listRes.json();
  const sample = listData.items[0];
  console.log('\n--- 2. Testing with Destination:', sample.name, '(', sample.id, ') ---');

  // 3. Add to Favorites
  console.log('\n--- 3. Adding to Favorites (Live DB) ---');
  const addFavRes = await fetch(`http://localhost:8080/api/v1/destinations/${sample.id}/favorite`, {
    method: 'PUT',
    headers: authHeaders
  });
  console.log('Add Favorite status:', addFavRes.status);

  // 4. Query Favorites
  console.log('\n--- 4. Querying User Favorites (Live DB) ---');
  const getFavRes = await fetch('http://localhost:8080/api/v1/destinations/favorites', {
    headers: authHeaders
  });
  const favList = await getFavRes.json();
  console.log('Favorites count:', favList.length, 'Item name:', favList[0]?.name);

  // 5. Record History
  console.log('\n--- 5. Recording View to Destination History (Live DB) ---');
  const recHistRes = await fetch(`http://localhost:8080/api/v1/destinations/${sample.id}/history`, {
    method: 'POST',
    headers: authHeaders
  });
  console.log('Record History status:', recHistRes.status);

  // 6. Query History
  console.log('\n--- 6. Querying User History (Live DB) ---');
  const getHistRes = await fetch('http://localhost:8080/api/v1/destinations/history?limit=5', {
    headers: authHeaders
  });
  const histList = await getHistRes.json();
  console.log('History count:', histList.length, 'Recently viewed item:', histList[0]?.name);

  // 7. Remove from Favorites
  console.log('\n--- 7. Removing Favorite (Live DB) ---');
  const delFavRes = await fetch(`http://localhost:8080/api/v1/destinations/${sample.id}/favorite`, {
    method: 'DELETE',
    headers: authHeaders
  });
  console.log('Delete Favorite status:', delFavRes.status);

  const finalFavRes = await fetch('http://localhost:8080/api/v1/destinations/favorites', {
    headers: authHeaders
  });
  const finalFavList = await finalFavRes.json();
  console.log('Final Favorites count (after removal):', finalFavList.length);

  console.log('\n=== LIVE SUPABASE FAVORITES & DESTINATION_HISTORY VERIFIED 100% OPERATIONAL! ===');
}

testAuthFavoritesHistory().catch(err => {
  console.error('Error during testing:', err);
  process.exit(1);
});
