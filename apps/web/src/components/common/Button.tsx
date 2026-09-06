import { ButtonHTMLAttributes, forwardRef, ReactNode, ElementType } from 'react';

interface ButtonProps<E extends ElementType = 'button'> {
  as?: E;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}

type PolymorphicButtonProps<E extends ElementType> = ButtonProps<E> & 
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonProps> & 
  Omit<React.ComponentPropsWithRef<E>, keyof ButtonProps | 'ref'>;

const Button = forwardRef(function Button<E extends ElementType = 'button'>(
  { 
    as,
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    fullWidth = false,
    disabled,
    className = '', 
    children, 
    ...props 
  }: PolymorphicButtonProps<E>,
  ref: React.Ref<HTMLButtonElement | HTMLAnchorElement>
) {
  const Component = as || 'button';
  
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-700/40 hover:-translate-y-0.5 focus:ring-blue-500/30 dark:bg-blue-600 dark:hover:bg-blue-700',
    secondary: 'border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-slate-500/30',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 hover:shadow-red-700/40 hover:-translate-y-0.5 focus:ring-red-500/30',
    ghost: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white focus:ring-slate-500/30',
  };

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm gap-1.5',
    md: 'px-4 py-3 text-base gap-2',
    lg: 'px-6 py-4 text-lg gap-2.5',
  };

  return (
    <Component
      ref={ref as React.Ref<HTMLButtonElement & HTMLAnchorElement>}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...(props as React.ComponentPropsWithRef<typeof Component>)}
    >
      <span className="flex items-center gap-2 whitespace-nowrap">
        {loading && (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </span>
    </Component>
  );
}) as <E extends ElementType = 'button'>(props: PolymorphicButtonProps<E>) => JSX.Element;

export default Button;
