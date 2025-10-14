import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }){
  const [user, setUser] = useState(()=> {
    const raw = localStorage.getItem('ql:user')
    return raw ? JSON.parse(raw) : null
  })
  
  const login = (u) => { 
    setUser(u); 
    localStorage.setItem('ql:user', JSON.stringify(u)) 
  }
  
  const logout = () => { 
    setUser(null); 
    localStorage.removeItem('ql:user') 
  }
  
  const value = useMemo(()=> ({ user, login, logout }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

