-- Refuerzo: además de set_config en el cuerpo (20260403180000), fijar el GUC a nivel de función.
-- En algunos despliegues el INSERT al audit seguía evaluando RLS con el rol de sesión.

alter function public.finance_audit_trigger() set row_security to off;

comment on function public.finance_audit_trigger() is
  'SECURITY DEFINER + row_security off (función y sesión local): INSERT en finance_transaction_audit sin bloqueo RLS.';

notify pgrst, 'reload schema';
