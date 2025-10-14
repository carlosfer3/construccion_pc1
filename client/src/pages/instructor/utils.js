export function badgeClassByEstado(estado){
  switch(estado){
    case 'PENDIENTE':
      return 'warning'
    case 'APROBADA':
      return 'success'
    case 'ENTREGADA':
    case 'PREPARADA':
      return 'info'
    case 'RECHAZADA':
    case 'CERRADA':
      return 'danger'
    default:
      return 'neutral'
  }
}
