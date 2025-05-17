interface ButtonGroupProps<T extends string> {
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

const ButtonGroup = <T extends string>({
  title,
  options,
  value,
  onChange,
}: ButtonGroupProps<T>) => {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {options.map(option => (
          <button
            key={option.value}
            className={`btn ${value === option.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ButtonGroup;
