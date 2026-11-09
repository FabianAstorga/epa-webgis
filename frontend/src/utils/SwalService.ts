import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const base = {
  background: '#ffffff',
  confirmButtonColor: '#002855',
  cancelButtonColor: '#b91c1c',
  customClass: {
    title: 'font-black tracking-tighter uppercase text-[#002855]',
    htmlContainer: 'text-slate-600 text-sm',
    confirmButton: 'rounded-none font-black tracking-widest uppercase text-xs px-6 py-3',
    cancelButton: 'rounded-none font-black tracking-widest uppercase text-xs px-6 py-3',
  },
};

/** Alertas uniformes del prototipo (misma línea visual que SISAC). */
export const ui = {
  confirmar: async (titulo: string, texto: string): Promise<boolean> => {
    const result = await MySwal.fire({
      ...base,
      title: titulo,
      text: texto,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });
    return result.isConfirmed;
  },

  exito: (titulo: string, msj = '') => {
    void MySwal.fire({
      ...base,
      title: titulo,
      text: msj,
      icon: 'success',
      timer: 2200,
      showConfirmButton: false,
    });
  },

  error: (msj: string, titulo = 'No fue posible continuar') => {
    void MySwal.fire({
      ...base,
      title: titulo,
      text: msj,
      icon: 'error',
      confirmButtonText: 'Cerrar',
    });
  },

  info: (titulo: string, html: string) => {
    void MySwal.fire({
      ...base,
      title: titulo,
      html,
      icon: 'info',
      confirmButtonText: 'Entendido',
    });
  },
};
