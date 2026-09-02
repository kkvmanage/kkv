import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';

export interface AgeDobValue {
  mode: 'dob' | 'age';
  dateOfBirth: string;
  age: number;
}

export interface AgeDobInputProps {
  dateOfBirth?: string;
  age?: number;
  initialMode?: 'dob' | 'age';
  onChange: (value: AgeDobValue) => void;
}

export function calculateAgeFromDob(dobString: string): number | null {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let calculatedAge = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    calculatedAge--;
  }
  return calculatedAge >= 0 ? calculatedAge : null;
}

export const AgeDobInput: React.FC<AgeDobInputProps> = ({
  dateOfBirth = '',
  age = 30,
  initialMode = 'age',
  onChange
}) => {
  const [mode, setMode] = useState<'dob' | 'age'>(initialMode);
  const [dobVal, setDobVal] = useState<string>(dateOfBirth);
  const [ageVal, setAgeVal] = useState<number>(age || 30);

  useEffect(() => {
    if (dateOfBirth) setDobVal(dateOfBirth);
    if (age) setAgeVal(age);
  }, [dateOfBirth, age]);

  const handleModeChange = (newMode: 'dob' | 'age') => {
    setMode(newMode);
    if (newMode === 'dob') {
      const calculated = calculateAgeFromDob(dobVal);
      const finalAge = calculated !== null ? calculated : ageVal;
      onChange({ mode: 'dob', dateOfBirth: dobVal, age: finalAge });
    } else {
      onChange({ mode: 'age', dateOfBirth: '', age: ageVal });
    }
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDobVal(val);
    const calculated = calculateAgeFromDob(val);
    const finalAge = calculated !== null ? calculated : ageVal;
    if (calculated !== null) {
      setAgeVal(calculated);
    }
    onChange({ mode: 'dob', dateOfBirth: val, age: finalAge });
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(1, Math.min(120, parseInt(e.target.value, 10) || 0));
    setAgeVal(val);
    onChange({ mode: 'age', dateOfBirth: '', age: val });
  };

  const currentCalcAge = mode === 'dob' ? calculateAgeFromDob(dobVal) : null;

  return (
    <div className="form-group" style={{ margin: 0 }}>
      {/* Header Label + Segmented Control Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}
      >
        <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>
          AGE / DATE OF BIRTH
        </label>

        {/* Segmented Control Pill Toggle */}
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: 'var(--bg-surface-secondary, #f1f5f9)',
            padding: '3px',
            borderRadius: '20px',
            border: '1px solid var(--border-light, #cbd5e1)'
          }}
        >
          <button
            type="button"
            onClick={() => handleModeChange('dob')}
            style={{
              padding: '3px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: mode === 'dob' ? 'var(--color-primary-accent, #059669)' : 'transparent',
              color: mode === 'dob' ? '#ffffff' : 'var(--text-muted, #64748b)',
              boxShadow: mode === 'dob' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            DOB
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('age')}
            style={{
              padding: '3px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: mode === 'age' ? 'var(--color-primary-accent, #059669)' : 'transparent',
              color: mode === 'age' ? '#ffffff' : 'var(--text-muted, #64748b)',
              boxShadow: mode === 'age' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            AGE
          </button>
        </div>
      </div>

      {/* Input Area */}
      {mode === 'dob' ? (
        <div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="date"
              className="input-control"
              value={dobVal}
              onChange={handleDobChange}
              style={{ paddingRight: '36px', width: '100%' }}
            />
            <Calendar
              size={16}
              style={{
                position: 'absolute',
                right: '12px',
                pointerEvents: 'none',
                color: 'var(--color-primary-dark, #0f172a)',
                opacity: 0.6
              }}
            />
          </div>

          {currentCalcAge !== null && (
            <div
              style={{
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#059669',
                fontWeight: 700
              }}
            >
              <CheckCircle2 size={13} />
              <span>Calculated Age: <strong>{currentCalcAge} Years</strong></span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            type="number"
            min={1}
            max={120}
            className="input-control"
            placeholder="Enter customer age"
            value={ageVal || ''}
            onChange={handleAgeChange}
            style={{ width: '100%' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
            Age in years (e.g. 28)
          </span>
        </div>
      )}
    </div>
  );
};
