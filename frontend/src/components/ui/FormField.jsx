function FormField({ label, name, type = 'text', value, onChange, error, ...props }) {
  return (
    <label className="form-field" htmlFor={name}>
      <span>{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <small className="field-error">{error}</small>}
    </label>
  )
}

export default FormField
