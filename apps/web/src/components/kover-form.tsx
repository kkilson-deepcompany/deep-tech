import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  EMPTY_KOVER_FORM,
  KOVER_ASEGURADORAS,
  KOVER_BANCOS_VE,
  KOVER_ESTADOS_CIVILES,
  KOVER_FRECUENCIAS_PAGO,
  KOVER_OCUPACIONES,
  KOVER_PARENTESCOS,
  KOVER_PREGUNTAS_HISTORIAL,
  KOVER_PREGUNTAS_SALUD_GENERAL,
  KOVER_TIPOS_CUENTA,
  calcularIMC,
  emptyKoverPersona,
  koverPersonas,
  nombrePersona,
  type HealthAnswer,
  type KoverFormData,
  type KoverPersona,
} from '@/lib/kover-form';
import { useDialog } from '@/lib/dialog-service';
import { FormField } from '@/components/form-field';
import { KoverFileUpload } from '@/components/kover-file-upload';
import { SignaturePad } from '@/components/signature-pad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface KoverFormProps {
  initialData?: Partial<KoverFormData>;
  /** Id de la solicitud guardada en la BD; null si aún no se ha guardado.
   *  Los slots de upload solo aparecen cuando este id existe. */
  applicationId?: string | null;
  /** Si está, el form opera en modo público (anon): los uploads usan las
   *  RPCs `kover_*_by_token` en vez de la tabla directamente. */
  publicToken?: string;
  /** Modo solo lectura — usado en el link público una vez `submitted`. */
  readOnly?: boolean;
  onSubmit: (data: KoverFormData, intent: 'draft' | 'final') => void;
  busy?: boolean;
}

/** Header colapsable de cada sección con número, título y contador. */
function Seccion({
  numero,
  titulo,
  abierta,
  onToggle,
  children,
}: {
  numero: number;
  titulo: string;
  abierta: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="bg-primary text-primary-foreground font-mono flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
          {numero}
        </span>
        <span className="font-heading flex-1 text-base font-semibold">{titulo}</span>
        {abierta ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {abierta && <div className="space-y-3 border-t p-4">{children}</div>}
    </section>
  );
}

/** Pregunta binaria + bloque de detalle desplegable cuando answer=true. */
function PreguntaSalud({
  code,
  pregunta,
  value,
  onChange,
  applicationId,
  publicToken,
  readOnly,
}: {
  code: string;
  pregunta: string;
  value: HealthAnswer | undefined;
  onChange: (next: HealthAnswer) => void;
  applicationId?: string | null;
  publicToken?: string;
  readOnly?: boolean;
}) {
  const current = value ?? { answer: false };

  function setAnswer(answer: boolean) {
    onChange({ ...current, answer });
  }
  function patch(p: Partial<HealthAnswer>) {
    onChange({ ...current, ...p });
  }

  return (
    <div className={cn('rounded-md border p-3', current.answer && 'bg-amber-50/40')}>
      <div className="flex items-start gap-3">
        <div className="flex-1 text-sm">{pregunta}</div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setAnswer(false)}
            className={cn(
              'rounded px-3 py-1 text-xs font-medium',
              !current.answer
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50',
            )}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => setAnswer(true)}
            className={cn(
              'rounded px-3 py-1 text-xs font-medium',
              current.answer
                ? 'bg-amber-600 text-white'
                : 'text-muted-foreground hover:bg-muted/50',
            )}
          >
            Sí
          </button>
        </div>
      </div>

      {current.answer && (
        <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2">
          <FormField label="Fecha del diagnóstico" htmlFor={`${code}-date`}>
            <Input
              id={`${code}-date`}
              type="date"
              value={current.diagnosis_date ?? ''}
              onChange={(e) => patch({ diagnosis_date: e.target.value })}
            />
          </FormField>
          <FormField label="Especialista consultado" htmlFor={`${code}-spec`}>
            <Input
              id={`${code}-spec`}
              value={current.specialist ?? ''}
              onChange={(e) => patch({ specialist: e.target.value })}
            />
          </FormField>
          <FormField label="Medicamento" htmlFor={`${code}-med`}>
            <Input
              id={`${code}-med`}
              value={current.medication_name ?? ''}
              onChange={(e) => patch({ medication_name: e.target.value })}
            />
          </FormField>
          <FormField label="Dosis" htmlFor={`${code}-dose`}>
            <Input
              id={`${code}-dose`}
              value={current.medication_dosage ?? ''}
              onChange={(e) => patch({ medication_dosage: e.target.value })}
            />
          </FormField>
          <FormField label="Frecuencia" htmlFor={`${code}-freq`}>
            <Input
              id={`${code}-freq`}
              value={current.medication_frequency ?? ''}
              onChange={(e) => patch({ medication_frequency: e.target.value })}
            />
          </FormField>
          <FormField label="Tiempo en tratamiento" htmlFor={`${code}-time`}>
            <Input
              id={`${code}-time`}
              value={current.treatment_duration ?? ''}
              onChange={(e) => patch({ treatment_duration: e.target.value })}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Notas / observaciones" htmlFor={`${code}-notes`}>
              <Textarea
                id={`${code}-notes`}
                rows={2}
                value={current.notes ?? ''}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-xs sm:col-span-2">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={current.has_reports ?? false}
              onChange={(e) => patch({ has_reports: e.target.checked })}
            />
            Posee informes médicos / exámenes disponibles
          </label>

          {/* Slot de adjunto (informe/examen) por pregunta afirmativa.
              Solo aparece si la solicitud ya tiene id (= guardada como borrador). */}
          {applicationId && (
            <div className="sm:col-span-2">
              <KoverFileUpload
                applicationId={applicationId}
                publicToken={publicToken}
                readOnly={readOnly}
                docType="informe_medico"
                label="Informes / exámenes / fotos para esta condición"
                relatedQuestionCode={code}
                accept="application/pdf,image/jpeg,image/png"
                maxSizeBytes={10 * 1024 * 1024}
                maxSizeLabel="10 MB"
                multiple
                maxFiles={30}
                capture
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function KoverForm({
  initialData,
  applicationId,
  publicToken,
  readOnly = false,
  onSubmit,
  busy = false,
}: KoverFormProps) {
  const buildInitial = (): KoverFormData => {
    const base = { ...EMPTY_KOVER_FORM, ...initialData };
    return { ...base, personas: koverPersonas(base).map((p) => ({ ...p, health: { ...p.health } })) };
  };
  const [data, setData] = useState<KoverFormData>(buildInitial);
  const [open, setOpen] = useState<number | null>(1);
  const dialog = useDialog();

  useEffect(() => {
    setData(buildInitial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  function set<K extends keyof KoverFormData>(field: K, value: KoverFormData[K]) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  const personas = data.personas ?? [];
  const titular = personas[0] ?? emptyKoverPersona();

  function setPersona(i: number, patch: Partial<KoverPersona>) {
    setData((prev) => {
      const ps = [...(prev.personas ?? [])];
      if (ps[i]) ps[i] = { ...ps[i], ...patch };
      return { ...prev, personas: ps };
    });
  }
  function setPersonaHealth(i: number, code: string, answer: HealthAnswer) {
    setData((prev) => {
      const ps = [...(prev.personas ?? [])];
      const cur = ps[i];
      if (cur) ps[i] = { ...cur, health: { ...cur.health, [code]: answer } };
      return { ...prev, personas: ps };
    });
  }
  function addBeneficiario() {
    setData((prev) => ({ ...prev, personas: [...(prev.personas ?? []), emptyKoverPersona('beneficiario')] }));
  }
  function removeBeneficiario(i: number) {
    setData((prev) => ({ ...prev, personas: (prev.personas ?? []).filter((_, idx) => idx !== i) }));
  }

  const imc = useMemo(
    () => calcularIMC(titular.weight_kg, titular.height_m),
    [titular.weight_kg, titular.height_m],
  );
  const positivas = useMemo(
    () => personas.reduce((s, p) => s + Object.values(p.health ?? {}).filter((h) => h.answer).length, 0),
    [personas],
  );

  function toggle(n: number) {
    setOpen((cur) => (cur === n ? null : n));
  }

  async function handleSubmit(intent: 'draft' | 'final') {
    if (intent === 'final') {
      if (!titular.first_name.trim() || !titular.last_name.trim()) {
        await dialog.alert({
          title: 'Datos incompletos',
          description: 'Faltan nombres y apellidos del titular.',
          tone: 'warning',
        });
        return;
      }
      if (!titular.id_document.trim()) {
        await dialog.alert({
          title: 'Datos incompletos',
          description: 'Falta la cédula del titular.',
          tone: 'warning',
        });
        return;
      }
      // Cada beneficiario debe tener al menos nombre y cédula.
      const bnfIncompleto = personas
        .slice(1)
        .find((p) => !p.first_name.trim() || !p.last_name.trim() || !p.id_document.trim());
      if (bnfIncompleto) {
        await dialog.alert({
          title: 'Beneficiario incompleto',
          description: `Faltan nombre/apellido o cédula de ${nombrePersona(bnfIncompleto)}.`,
          tone: 'warning',
        });
        return;
      }
      if (!data.accepted_terms) {
        await dialog.alert({
          title: 'Términos y condiciones',
          description: 'Debes aceptar los términos y condiciones para enviar.',
          tone: 'warning',
        });
        return;
      }
    }
    // Sincroniza los campos planos del titular (columnas denormalizadas / PDF).
    const finalData: KoverFormData = {
      ...data,
      first_name: titular.first_name,
      last_name: titular.last_name,
      id_document: titular.id_document,
      birth_date: titular.birth_date,
      birth_place: titular.birth_place,
      nationality: titular.nationality,
      civil_status: titular.civil_status,
      weight_kg: titular.weight_kg,
      height_m: titular.height_m,
      health: titular.health,
    };
    onSubmit(finalData, intent);
  }

  return (
    <fieldset disabled={readOnly} className="contents">
      <div className="space-y-3">
      {/* === SECCIÓN 1 === */}
      <Seccion numero={1} titulo="Información de la solicitud" abierta={open === 1} onToggle={() => toggle(1)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Fecha de la solicitud" htmlFor="application_date" required>
            <Input
              id="application_date"
              type="date"
              value={data.application_date}
              onChange={(e) => set('application_date', e.target.value)}
            />
          </FormField>
          <FormField label="Compañía aseguradora" htmlFor="insurer" required>
            <Select id="insurer" value={data.insurer} onChange={(e) => set('insurer', e.target.value)}>
              <option value="">— Selecciona —</option>
              {KOVER_ASEGURADORAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Suma asegurada (USD)" htmlFor="insured_amount_usd" required>
            <Input
              id="insured_amount_usd"
              type="number"
              min="0"
              step="0.01"
              value={data.insured_amount_usd}
              onChange={(e) => set('insured_amount_usd', e.target.value)}
            />
          </FormField>
          <FormField label="Frecuencia de pago" htmlFor="payment_frequency" required>
            <Select
              id="payment_frequency"
              value={data.payment_frequency}
              onChange={(e) => set('payment_frequency', e.target.value)}
            >
              {KOVER_FRECUENCIAS_PAGO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </Seccion>

      {/* === SECCIÓN 2 — Datos del titular === */}
      <Seccion numero={2} titulo="Datos personales (titular)" abierta={open === 2} onToggle={() => toggle(2)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Nombres" htmlFor="first_name" required>
            <Input id="first_name" value={titular.first_name} onChange={(e) => setPersona(0, { first_name: e.target.value })} />
          </FormField>
          <FormField label="Apellidos" htmlFor="last_name" required>
            <Input id="last_name" value={titular.last_name} onChange={(e) => setPersona(0, { last_name: e.target.value })} />
          </FormField>
          <FormField label="Cédula / documento" htmlFor="id_document" required>
            <Input
              id="id_document"
              placeholder="V-12345678"
              value={titular.id_document}
              onChange={(e) => setPersona(0, { id_document: e.target.value })}
            />
          </FormField>
          <FormField label="Fecha de nacimiento" htmlFor="birth_date" required>
            <Input
              id="birth_date"
              type="date"
              value={titular.birth_date}
              onChange={(e) => setPersona(0, { birth_date: e.target.value })}
            />
          </FormField>
          <FormField label="Lugar de nacimiento" htmlFor="birth_place" required>
            <Input id="birth_place" value={titular.birth_place} onChange={(e) => setPersona(0, { birth_place: e.target.value })} />
          </FormField>
          <FormField label="Nacionalidad" htmlFor="nationality">
            <Input id="nationality" value={titular.nationality} onChange={(e) => setPersona(0, { nationality: e.target.value })} />
          </FormField>
          <FormField label="Estado civil" htmlFor="civil_status" required>
            <Select id="civil_status" value={titular.civil_status} onChange={(e) => setPersona(0, { civil_status: e.target.value })}>
              <option value="">— Selecciona —</option>
              {KOVER_ESTADOS_CIVILES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Peso (kg)" htmlFor="weight_kg" required>
            <Input
              id="weight_kg"
              type="number"
              min="30"
              max="250"
              step="0.1"
              value={titular.weight_kg}
              onChange={(e) => setPersona(0, { weight_kg: e.target.value })}
            />
          </FormField>
          <FormField label="Altura (m)" htmlFor="height_m" required>
            <Input
              id="height_m"
              type="number"
              min="1.20"
              max="2.30"
              step="0.01"
              value={titular.height_m}
              onChange={(e) => setPersona(0, { height_m: e.target.value })}
            />
          </FormField>
          <FormField label="IMC (calculado)" htmlFor="bmi">
            <Input id="bmi" readOnly value={imc ?? ''} className="bg-muted/50" />
          </FormField>
        </div>
      </Seccion>

      {/* === SECCIÓN 3 === */}
      <Seccion numero={3} titulo="Datos laborales y de contacto" abierta={open === 3} onToggle={() => toggle(3)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Ocupación" htmlFor="occupation" required>
            <Select id="occupation" value={data.occupation} onChange={(e) => set('occupation', e.target.value)}>
              <option value="">— Selecciona —</option>
              {KOVER_OCUPACIONES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Actividad económica" htmlFor="economic_activity" required>
            <Input
              id="economic_activity"
              value={data.economic_activity}
              onChange={(e) => set('economic_activity', e.target.value)}
            />
          </FormField>
          <FormField label="Ramo" htmlFor="industry">
            <Input id="industry" value={data.industry} onChange={(e) => set('industry', e.target.value)} />
          </FormField>
          <FormField label="Profesión u oficio" htmlFor="profession" required>
            <Input id="profession" value={data.profession} onChange={(e) => set('profession', e.target.value)} />
          </FormField>
          <FormField label="Correo electrónico" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </FormField>
          <FormField label="Teléfono" htmlFor="phone" required>
            <Input
              id="phone"
              placeholder="0414-1234567"
              value={data.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </FormField>
          <FormField label="País" htmlFor="country">
            <Input id="country" value={data.country} onChange={(e) => set('country', e.target.value)} />
          </FormField>
          <FormField label="Estado / Ciudad" htmlFor="state_city" required>
            <Input id="state_city" value={data.state_city} onChange={(e) => set('state_city', e.target.value)} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Dirección detallada" htmlFor="address_line" required>
              <Input
                id="address_line"
                placeholder="Urb / Av / Calle / Edif / Piso / Apto"
                value={data.address_line}
                onChange={(e) => set('address_line', e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Código postal" htmlFor="postal_code">
            <Input id="postal_code" value={data.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
          </FormField>
        </div>
      </Seccion>

      {/* === SECCIÓN 4 === */}
      <Seccion numero={4} titulo="Datos bancarios" abierta={open === 4} onToggle={() => toggle(4)}>
        <p className="text-muted-foreground text-xs">
          Datos sensibles. En v1 se guardan en texto plano; en producción se cifrarán con pgcrypto.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Banco" htmlFor="bank_name" required>
            <Input
              id="bank_name"
              list="kover-bancos"
              placeholder="Selecciona o escribe el banco"
              value={data.bank_name}
              onChange={(e) => set('bank_name', e.target.value)}
            />
            <datalist id="kover-bancos">
              {KOVER_BANCOS_VE.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </FormField>
          <FormField label="Tipo de cuenta" htmlFor="account_type" required>
            <Select
              id="account_type"
              value={data.account_type}
              onChange={(e) => set('account_type', e.target.value)}
            >
              <option value="">— Selecciona —</option>
              {KOVER_TIPOS_CUENTA.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Número de cuenta (20 dígitos)" htmlFor="account_number" required>
              <Input
                id="account_number"
                inputMode="numeric"
                maxLength={20}
                value={data.account_number}
                onChange={(e) => set('account_number', e.target.value.replace(/\D/g, ''))}
              />
            </FormField>
          </div>
        </div>

        {/* Cuenta internacional (opcional) */}
        <div className="mt-3 rounded-md border p-3">
          <p className="mb-2 text-sm font-semibold">Cuenta internacional (opcional)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Banco internacional" htmlFor="intl_bank">
              <Input id="intl_bank" value={data.intl_bank} onChange={(e) => set('intl_bank', e.target.value)} />
            </FormField>
            <FormField label="SWIFT / BIC" htmlFor="intl_swift">
              <Input id="intl_swift" value={data.intl_swift} onChange={(e) => set('intl_swift', e.target.value)} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="N.º de cuenta / IBAN" htmlFor="intl_account">
                <Input id="intl_account" value={data.intl_account} onChange={(e) => set('intl_account', e.target.value)} />
              </FormField>
            </div>
          </div>
        </div>
      </Seccion>

      {/* === SECCIÓN 5 — Beneficiarios (N) === */}
      <Seccion
        numero={5}
        titulo={`Beneficiarios · ${personas.length - 1}`}
        abierta={open === 5}
        onToggle={() => toggle(5)}
      >
        <p className="text-muted-foreground text-xs">
          Agrega a las personas adicionales a cubrir (cónyuge, hijos, padres…). Cada beneficiario
          también responderá su cuestionario médico en las secciones 6 y 7.
        </p>
        {personas.slice(1).map((p, idx) => {
          const i = idx + 1; // índice real en personas
          return (
            <div key={i} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Beneficiario {idx + 1}
                  {p.first_name ? ` · ${nombrePersona(p)}` : ''}
                </span>
                {!readOnly && (
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => removeBeneficiario(i)}>
                    Quitar
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Nombres" htmlFor={`bnf-${i}-fn`} required>
                  <Input id={`bnf-${i}-fn`} value={p.first_name} onChange={(e) => setPersona(i, { first_name: e.target.value })} />
                </FormField>
                <FormField label="Apellidos" htmlFor={`bnf-${i}-ln`} required>
                  <Input id={`bnf-${i}-ln`} value={p.last_name} onChange={(e) => setPersona(i, { last_name: e.target.value })} />
                </FormField>
                <FormField label="Cédula / documento" htmlFor={`bnf-${i}-id`} required>
                  <Input id={`bnf-${i}-id`} value={p.id_document} onChange={(e) => setPersona(i, { id_document: e.target.value })} />
                </FormField>
                <FormField label="Parentesco" htmlFor={`bnf-${i}-rel`} required>
                  <Select id={`bnf-${i}-rel`} value={p.relationship} onChange={(e) => setPersona(i, { relationship: e.target.value })}>
                    <option value="">— Selecciona —</option>
                    {KOVER_PARENTESCOS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Fecha de nacimiento" htmlFor={`bnf-${i}-bd`} required>
                  <Input id={`bnf-${i}-bd`} type="date" value={p.birth_date} onChange={(e) => setPersona(i, { birth_date: e.target.value })} />
                </FormField>
                <FormField label="Estado civil" htmlFor={`bnf-${i}-cs`}>
                  <Select id={`bnf-${i}-cs`} value={p.civil_status} onChange={(e) => setPersona(i, { civil_status: e.target.value })}>
                    <option value="">— Selecciona —</option>
                    {KOVER_ESTADOS_CIVILES.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Peso (kg)" htmlFor={`bnf-${i}-w`}>
                  <Input id={`bnf-${i}-w`} type="number" min="0" max="250" step="0.1" value={p.weight_kg} onChange={(e) => setPersona(i, { weight_kg: e.target.value })} />
                </FormField>
                <FormField label="Altura (m)" htmlFor={`bnf-${i}-h`}>
                  <Input id={`bnf-${i}-h`} type="number" min="0" max="2.30" step="0.01" value={p.height_m} onChange={(e) => setPersona(i, { height_m: e.target.value })} />
                </FormField>
              </div>
            </div>
          );
        })}
        {!readOnly && (
          <Button variant="outline" onClick={addBeneficiario}>
            + Agregar beneficiario
          </Button>
        )}
      </Seccion>

      {/* === SECCIÓN 6 — SALUD GENERAL === */}
      <Seccion
        numero={6}
        titulo={`Declaración de salud general · ${KOVER_PREGUNTAS_SALUD_GENERAL.length} preguntas`}
        abierta={open === 6}
        onToggle={() => toggle(6)}
      >
        {personas.map((p, i) => (
          <div key={i} className="space-y-2">
            <p className="bg-muted/40 rounded px-2 py-1 text-sm font-semibold">
              {nombrePersona(p)} {i === 0 ? '(titular)' : `(${p.relationship || 'beneficiario'})`}
            </p>
            {KOVER_PREGUNTAS_SALUD_GENERAL.map((q) => (
              <PreguntaSalud
                key={`${i}-${q.code}`}
                code={`p${i}_${q.code}`}
                pregunta={q.pregunta}
                value={p.health[q.code]}
                onChange={(h) => setPersonaHealth(i, q.code, h)}
                applicationId={applicationId}
                publicToken={publicToken}
                readOnly={readOnly}
              />
            ))}
          </div>
        ))}
      </Seccion>

      {/* === SECCIÓN 7 — HISTORIAL MÉDICO === */}
      <Seccion
        numero={7}
        titulo={`Historial médico específico · ${KOVER_PREGUNTAS_HISTORIAL.length} preguntas`}
        abierta={open === 7}
        onToggle={() => toggle(7)}
      >
        <p className="text-muted-foreground text-xs">
          Responde «Sí» solo donde aplique. Al marcar «Sí» se piden los detalles del diagnóstico,
          medicación y especialista que vio el caso.
        </p>
        {personas.map((p, i) => (
          <div key={i} className="space-y-2">
            <p className="bg-muted/40 rounded px-2 py-1 text-sm font-semibold">
              {nombrePersona(p)} {i === 0 ? '(titular)' : `(${p.relationship || 'beneficiario'})`}
            </p>
            {KOVER_PREGUNTAS_HISTORIAL.map((q) => (
              <PreguntaSalud
                key={`${i}-${q.code}`}
                code={`p${i}_${q.code}`}
                pregunta={q.pregunta}
                value={p.health[q.code]}
                onChange={(h) => setPersonaHealth(i, q.code, h)}
                applicationId={applicationId}
                publicToken={publicToken}
                readOnly={readOnly}
              />
            ))}
          </div>
        ))}
      </Seccion>

      {/* === SECCIÓN 8 — Documentos === */}
      <Seccion numero={8} titulo="Documentos" abierta={open === 8} onToggle={() => toggle(8)}>
        <p className="rounded-md border border-amber-300 bg-amber-50/50 p-3 text-xs text-amber-900">
          Resumen de documentos cargados. <strong>Mínimos requeridos:</strong> identificación
          (cédula) y RIF. Puedes subir un archivo o <strong>tomar una foto</strong>.
        </p>
        {applicationId ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <KoverFileUpload
              applicationId={applicationId}
              publicToken={publicToken}
              readOnly={readOnly}
              docType="cedula"
              label="Cédula de identidad"
              accept="application/pdf,image/jpeg,image/png"
              maxSizeBytes={5 * 1024 * 1024}
              maxSizeLabel="5 MB"
              required
              capture
            />
            <KoverFileUpload
              applicationId={applicationId}
              publicToken={publicToken}
              readOnly={readOnly}
              docType="rif"
              label="RIF"
              accept="application/pdf,image/jpeg,image/png"
              maxSizeBytes={5 * 1024 * 1024}
              maxSizeLabel="5 MB"
              required
              capture
            />
            <KoverFileUpload
              applicationId={applicationId}
              publicToken={publicToken}
              readOnly={readOnly}
              docType="pasaporte"
              label="Pasaporte"
              accept="application/pdf,image/jpeg,image/png"
              maxSizeBytes={5 * 1024 * 1024}
              maxSizeLabel="5 MB"
              capture
            />
            <KoverFileUpload
              applicationId={applicationId}
              publicToken={publicToken}
              readOnly={readOnly}
              docType="firma"
              label="Firma escaneada"
              accept="image/png,image/jpeg"
              maxSizeBytes={2 * 1024 * 1024}
              maxSizeLabel="2 MB"
            />
          </div>
        ) : (
          <div className="bg-muted/30 rounded-md border border-dashed p-4 text-center text-xs">
            <p className="text-muted-foreground">
              Para subir archivos, primero <strong>guarda como borrador</strong>. Después abre la
              solicitud desde la lista y carga los documentos aquí.
            </p>
          </div>
        )}
      </Seccion>

      {/* === SECCIÓN 9 — Aceptación / firma simple === */}
      <Seccion numero={9} titulo="Aceptación y firma" abierta={open === 9} onToggle={() => toggle(9)}>
        <p className="text-muted-foreground rounded-md border bg-amber-50/40 p-3 text-xs leading-relaxed">
          Declaro bajo fe de juramento que toda la información suministrada es <strong>veraz,
          completa, precisa y actualizada</strong>, sin omisiones que puedan inducir a error a la
          compañía de seguros. Reconozco que la omisión intencional de información médica
          constituye falta grave y puede dar lugar a la anulación de la póliza. Esta declaración
          tiene carácter <strong>confidencial</strong> y se usará exclusivamente para la
          evaluación, análisis de riesgo y emisión de la póliza correspondiente.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Nombre completo del firmante" htmlFor="signer_full_name">
            <Input
              id="signer_full_name"
              value={data.signer_full_name}
              onChange={(e) => set('signer_full_name', e.target.value)}
            />
          </FormField>
          <FormField label="Cédula del firmante" htmlFor="signer_id_document">
            <Input
              id="signer_id_document"
              value={data.signer_id_document}
              onChange={(e) => set('signer_id_document', e.target.value)}
            />
          </FormField>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-primary mt-0.5 size-4"
            checked={data.accepted_terms}
            onChange={(e) => set('accepted_terms', e.target.checked)}
          />
          <span>
            Acepto los términos y declaro bajo fe de juramento que la información proporcionada es
            veraz y completa.
          </span>
        </label>

        {/* Firma a pulso (manuscrita) */}
        <div className="mt-2">
          {readOnly ? (
            data.signature_data_url ? (
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground text-xs font-medium">Firma</p>
                <img
                  src={data.signature_data_url}
                  alt="Firma"
                  className="bg-card h-24 w-full max-w-sm rounded border border-gray-400 object-contain"
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">Sin firma registrada.</p>
            )
          ) : (
            <SignaturePad
              label="Firme aquí (a pulso, con el dedo o el mouse)"
              value={data.signature_data_url || null}
              onChange={(url) => set('signature_data_url', url ?? '')}
            />
          )}
        </div>
      </Seccion>

      {/* === Resumen + acciones === */}
      <div className="bg-muted/30 sticky bottom-0 -mx-4 -mb-4 flex flex-wrap items-center gap-3 border-t px-4 py-3 sm:-mx-6 sm:-mb-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="text-muted-foreground">
            IMC: <span className="text-foreground font-mono font-semibold">{imc ?? '—'}</span>
          </span>
          <span className="text-muted-foreground">
            Respuestas afirmativas:{' '}
            <span
              className={cn(
                'font-mono font-semibold',
                positivas > 5 ? 'text-amber-700' : 'text-foreground',
              )}
            >
              {positivas} / {KOVER_PREGUNTAS_SALUD_GENERAL.length + KOVER_PREGUNTAS_HISTORIAL.length}
            </span>
          </span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" disabled={busy || readOnly} onClick={() => handleSubmit('draft')}>
            Guardar borrador
          </Button>
          <Button disabled={busy || readOnly} onClick={() => handleSubmit('final')}>
            {busy && <Spinner className="size-4" />}
            Enviar solicitud
          </Button>
        </div>
      </div>
    </div>
    </fieldset>
  );
}

