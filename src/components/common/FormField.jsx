/**
 * @param {Object} props
 * @param {string} props.id
 * @param {string} props.label
 * @param {string} [props.error]
 * @param {import('react').ReactNode} props.children
 */
export default function FormField({ id, label, error, children }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
