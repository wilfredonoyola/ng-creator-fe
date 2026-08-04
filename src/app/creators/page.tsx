"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { CREATORS, LICENSES, CREAR_CREATOR, CREAR_LICENSE } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Creator {
  _id: string;
  nombre: string;
  handle?: string;
  esPropio: boolean;
}

interface License {
  _id: string;
  scope: string;
  status: string;
  creatorId: string;
}

export default function CreatorsPage() {
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<string>("");
  const [creatorName, setCreatorName] = useState("");
  const [creatorHandle, setCreatorHandle] = useState("");
  const [licenseScope, setLicenseScope] = useState("");

  const { data: creatorsData, loading: loadingCreators } = useQuery(CREATORS);
  const { data: licensesData, loading: loadingLicenses } = useQuery(LICENSES);

  const creators: Creator[] = creatorsData?.creators ?? [];
  const licenses: License[] = licensesData?.licenses ?? [];

  const [crearCreator, { loading: creandoCreator }] = useMutation(CREAR_CREATOR, {
    refetchQueries: [{ query: CREATORS }],
    onCompleted: () => {
      setShowCreatorModal(false);
      setCreatorName("");
      setCreatorHandle("");
    },
  });

  const [crearLicense, { loading: creandoLicense }] = useMutation(CREAR_LICENSE, {
    refetchQueries: [{ query: LICENSES }],
    onCompleted: () => {
      setShowLicenseModal(false);
      setSelectedCreator("");
      setLicenseScope("");
    },
  });

  const handleCreateCreator = () => {
    if (!creatorName.trim()) return;
    crearCreator({
      variables: {
        input: {
          nombre: creatorName,
          handle: creatorHandle || undefined,
        },
      },
    });
  };

  const handleCreateLicense = () => {
    if (!selectedCreator || !licenseScope.trim()) return;
    crearLicense({
      variables: {
        input: {
          creatorId: selectedCreator,
          scope: licenseScope,
        },
      },
    });
  };

  const getLicensesForCreator = (creatorId: string) => {
    return licenses.filter((l) => l.creatorId === creatorId);
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creators</h1>
          <p className="mt-1 text-white/50">
            Gestiona los creators y sus licencias
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowLicenseModal(true)}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
          >
            + Licencia
          </button>
          <button
            onClick={() => setShowCreatorModal(true)}
            className="rounded-xl bg-[#0FED9D] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#0FED9D]/90"
          >
            + Creator
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
          <p className="text-3xl font-bold text-[#0FED9D]">{creators.length}</p>
          <p className="mt-1 text-sm text-white/50">Creators totales</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
          <p className="text-3xl font-bold text-blue-400">
            {creators.filter((c) => c.esPropio).length}
          </p>
          <p className="mt-1 text-sm text-white/50">Propios</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
          <p className="text-3xl font-bold text-yellow-400">
            {licenses.filter((l) => l.status === "ACTIVA").length}
          </p>
          <p className="mt-1 text-sm text-white/50">Licencias activas</p>
        </div>
      </div>

      {/* Content */}
      {loadingCreators || loadingLicenses ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
        </div>
      ) : creators.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {creators.map((creator) => {
            const creatorLicenses = getLicensesForCreator(creator._id);
            return (
              <div
                key={creator._id}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0FED9D]/20 text-xl">
                      👤
                    </div>
                    <div>
                      <p className="font-medium">{creator.nombre}</p>
                      {creator.handle && (
                        <p className="text-sm text-white/40">@{creator.handle}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      creator.esPropio
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    {creator.esPropio ? "Propio" : "Externo"}
                  </span>
                </div>

                {/* Licenses */}
                <div className="space-y-2">
                  <p className="text-xs text-white/40">
                    {creatorLicenses.length} licencia{creatorLicenses.length !== 1 ? "s" : ""}
                  </p>
                  {creatorLicenses.map((lic) => (
                    <div
                      key={lic._id}
                      className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2"
                    >
                      <span className="text-sm">{lic.scope}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          lic.status === "ACTIVA"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {lic.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <div className="mb-4 text-5xl opacity-30">👤</div>
          <p className="text-lg font-medium text-white/60">No hay creators</p>
          <p className="mt-1 text-sm text-white/40">
            Crea tu primer creator para empezar
          </p>
          <button
            onClick={() => setShowCreatorModal(true)}
            className="mt-4 rounded-xl bg-[#0FED9D] px-6 py-3 font-medium text-black transition hover:bg-[#0FED9D]/90"
          >
            Crear Creator
          </button>
        </div>
      )}

      {/* Create Creator Modal */}
      {showCreatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <h2 className="mb-6 text-xl font-bold">Nuevo Creator</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Nombre *</label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Nombre del creator"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-[#0FED9D]/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Handle</label>
                <input
                  type="text"
                  value={creatorHandle}
                  onChange={(e) => setCreatorHandle(e.target.value)}
                  placeholder="@usuario (opcional)"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-[#0FED9D]/50"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreatorModal(false)}
                className="flex-1 rounded-xl border border-white/10 py-3 font-medium text-white/60 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCreator}
                disabled={creandoCreator || !creatorName.trim()}
                className="flex-1 rounded-xl bg-[#0FED9D] py-3 font-medium text-black transition hover:bg-[#0FED9D]/90 disabled:opacity-50"
              >
                {creandoCreator ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create License Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <h2 className="mb-6 text-xl font-bold">Nueva Licencia</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Creator *</label>
                <select
                  value={selectedCreator}
                  onChange={(e) => setSelectedCreator(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[#0FED9D]/50"
                >
                  <option value="">Seleccionar creator</option>
                  {creators.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Tipo de licencia *</label>
                <select
                  value={licenseScope}
                  onChange={(e) => setLicenseScope(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[#0FED9D]/50"
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="PROPIO">Propio - Material nuestro</option>
                  <option value="META_EXCLUSIVO">Meta Exclusivo - Solo Facebook/Instagram</option>
                  <option value="SOLO_PUBLICACION">Solo Publicación - Uso único</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowLicenseModal(false)}
                className="flex-1 rounded-xl border border-white/10 py-3 font-medium text-white/60 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateLicense}
                disabled={creandoLicense || !selectedCreator || !licenseScope.trim()}
                className="flex-1 rounded-xl bg-[#0FED9D] py-3 font-medium text-black transition hover:bg-[#0FED9D]/90 disabled:opacity-50"
              >
                {creandoLicense ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
