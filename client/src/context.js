import { createContext } from 'react'
// import { isNullOrUndefined } from 'util'; 

const Context = createContext({
    currentUser: null,
    isAuth: false,
    draft: null,
    pins:  [],
    currentPin: null
})

export default Context