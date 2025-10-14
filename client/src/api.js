const API_BASE_URL = 'http://localhost:3000'

async function http(method, url, data){
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`
  console.log(`🌐 API ${method} Request:`, fullUrl)
  if (data) console.log('📤 Request data:', data)
  
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (data !== undefined) opts.body = JSON.stringify(data)
  
  try {
    const res = await fetch(fullUrl, opts)
    console.log(`📥 Response status: ${res.status} ${res.statusText}`)
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('❌ API Error:', errorText)
      throw new Error(errorText)
    }
    
    const result = res.status === 204 ? null : await res.json()
    console.log('✅ API Response:', result)
    return result
  } catch (err) {
    console.error('🚫 Fetch Error:', err)
    throw err
  }
}
export const api = {
  get: (u)=> http('GET', u),
  post: (u,d)=> http('POST', u, d),
  put: (u,d)=> http('PUT', u, d),
  patch: (u,d)=> http('PATCH', u, d),
  del: (u)=> http('DELETE', u),
}
