import React from 'react';

interface ToggleProps {
  title: string;
  description: string;
  checked: boolean;
  descriptionClassName?: string;
  onChange: () => void;
}

const Toggle: React.FC<ToggleProps> = ({
  title,
  description,
  descriptionClassName = '',
  checked,
  onChange,
}) => {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">{title}</h3>
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <label className="toggle-switch">
            <input type="checkbox" checked={checked} onChange={onChange} />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <p className={`text-sm text-gray-600 dark:text-gray-400 flex-1 ${descriptionClassName}`}>
          {description}
        </p>
      </div>
    </div>
  );
};

export default Toggle;
