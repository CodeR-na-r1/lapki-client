import React from 'react';
import { useForm } from 'react-hook-form';

import { ChangeNameState } from '@renderer/types/other';

interface StateNameModalProps {
  isOpen: boolean;
  initial?: ChangeNameState;
  onClose: () => void;
  onRename: (data: StateNameModalFormValues) => void;
}

export interface StateNameModalFormValues {
  name: string;
}

export const StateNameModal: React.FC<StateNameModalProps> = ({
  isOpen,
  onClose,
  onRename,
  initial,
}) => {
  const { register, handleSubmit } = useForm<StateNameModalFormValues>();

  const onSubmit = handleSubmit(({ name }) => {
    onRename({ name: name || 'Состояние' });
  });

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') return onSubmit();
    if (e.key === 'Escape') return onClose();
  };

  if (!isOpen || !initial) return null;

  const inputStyle = {
    left: initial.position.x + 'px',
    top: initial.position.y + 'px',
    width: initial.sizes.width + 'px',
    height: initial.sizes.height + 'px',
    fontSize: Math.max(initial.sizes.fontSize, 15) + 'px',
    padding: `${0}px ${Math.max(initial.sizes.paddingX, 15)}px`,
  };

  return (
    <input
      style={inputStyle}
      autoFocus
      className="fixed rounded-t-[6px] bg-[#525252] text-white outline outline-2 outline-white"
      placeholder="Придумайте название"
      maxLength={20}
      onKeyUp={handleKeyUp}
      {...register('name', {
        onBlur: onClose,
        value: initial.state.data.name,
      })}
    />
  );
};
