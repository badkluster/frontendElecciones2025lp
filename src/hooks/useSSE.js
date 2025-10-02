import { useEffect } from 'react'
import { API_URL } from '../services/api'
import { useAuthStore } from '../store/auth'

export default function useSSE(onMessage){
  const token = useAuthStore(s=>s.token)
  useEffect(()=>{
    if(!token) return
    const es = new EventSource(`${API_URL}/events?token=${token}`, { withCredentials:false })
    es.onmessage = (e)=>{}
    es.addEventListener('connected', ()=>{})
    es.addEventListener('school:update', (e)=>{
      const data = JSON.parse(e.data)
      onMessage && onMessage(data)
    })
    return ()=> es.close()
  }, [token, onMessage])
}
