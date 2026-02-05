import React from 'react';

const steps = [
  { id: 1, label: '診療予約' },
  { id: 2, label: '新規会員登録 / ログイン' },
  { id: 3, label: '予約内容確認' },
];

export default function ReservationStepHeader({ currentStep = 1, title = '診療予約' }) {
  return (
    <header className="step-header">
      <h1 className="step-header-title">{title}</h1>

      <div className="stepper">
        <div className="stepper-line stepper-line-1" aria-hidden />
        <div className="stepper-line stepper-line-2" aria-hidden />

        <ol className="stepper-list" aria-label="予約の手順">
          {steps.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const stateClass = isActive
              ? 'stepper-dot-active'
              : isCompleted
              ? 'stepper-dot-completed'
              : 'stepper-dot-upcoming';

            return (
              <li
                key={step.id}
                className="stepper-item"
                aria-current={isActive ? 'step' : undefined}
              >
                <div className={`stepper-dot ${stateClass}`}>{step.id}</div>
                <span className={`stepper-label ${isActive ? 'stepper-label-active' : ''}`}>
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </header>
  );
}

