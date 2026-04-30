import { useState, useEffect } from "react";
import { Loader2, CarFront, Hash, Calendar, Fuel } from "lucide-react";
import { api } from "../lib/api";
import { SUPPORTED_BRANDS, getBrandIcon } from "../lib/vehicle-brands";
import Modal from "./ui/Modal";

interface Vehicle {
  id: string;
  name: string;
  licensePlate?: string;
  brand?: string;
  model?: string;
  year?: number;
  tank?: number;
}

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: "create" | "edit";
  initialData?: Vehicle | null;
}

export function VehicleModal({
  isOpen,
  onClose,
  onSuccess,
  mode = "create",
  initialData,
}: VehicleModalProps) {
  const isEditing = mode === "edit";
  const [name, setName] = useState(initialData?.name ?? "");
  const [licensePlate, setLicensePlate] = useState(
    initialData?.licensePlate ?? "",
  );
  const [brand, setBrand] = useState(initialData?.brand ?? "");
  const [model, setModel] = useState(initialData?.model ?? "");
  const [year, setYear] = useState(initialData?.year?.toString() ?? "");
  const [tank, setTank] = useState(initialData?.tank?.toString() ?? "50");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name ?? "");
      setLicensePlate(initialData?.licensePlate ?? "");
      setBrand(initialData?.brand ?? "");
      setModel(initialData?.model ?? "");
      setYear(initialData?.year?.toString() ?? "");
      setTank(initialData?.tank?.toString() ?? "50");
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        name,
        licensePlate: licensePlate || undefined,
        brand: brand || undefined,
        model: model || undefined,
        year: year ? Number(year) : undefined,
        tank: tank ? Number(tank) : 50,
      };

      if (isEditing && initialData) {
        await api.patch(`/api/v1/vehicles/${initialData.id}`, payload);
      } else {
        await api.post("/api/v1/vehicles", payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar veículo.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const title = isEditing ? "Editar Veículo" : "Novo Veículo";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      eyebrow="Fleet management"
      maxWidth="sm:max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="transactions-action w-full px-4 py-3 text-sm font-semibold sm:w-auto sm:py-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isLoading}
            className="transactions-primary inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar Veículo
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 p-4 sm:p-5">
        <div className="col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 mb-1.5 block">
            Nome / Apelido do Veículo
          </label>
          <div className="relative">
            <CarFront className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Meu Corolla, Moto Entrega"
              className="transactions-input w-full border border-slate-300/80 bg-white pl-10 pr-4 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 mb-1.5 block">
            Placa
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              placeholder="ABC-1234"
              className="transactions-input w-full border border-slate-300/80 bg-white pl-10 pr-4 py-2 text-sm outline-none uppercase font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 mb-1.5 block">
            Capacidade do Tanque (L)
          </label>
          <div className="relative">
            <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              required
              type="number"
              step="0.1"
              value={tank}
              onChange={(e) => setTank(e.target.value)}
              placeholder="Ex: 50"
              className="transactions-input w-full border border-slate-300/80 bg-white pl-10 pr-4 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 mb-1.5 flex items-center gap-2">
            Marca
            {brand && (
              <img
                src={getBrandIcon(brand)}
                className="w-3 h-3 grayscale opacity-60"
                alt=""
              />
            )}
          </label>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none appearance-none"
          >
            <option value="">Outra / Não informada</option>
            {SUPPORTED_BRANDS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 mb-1.5 block">
            Modelo
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Ex: Corolla XEI"
            className="transactions-input w-full border border-slate-300/80 bg-white px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 mb-1.5 block">
            Ano
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Ex: 2022"
              className="transactions-input w-full border border-slate-300/80 bg-white pl-10 pr-4 py-2 text-sm outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="col-span-2 semantic-expense px-3 py-2 text-sm">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
