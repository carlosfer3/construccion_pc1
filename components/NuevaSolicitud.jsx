import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Minus, Package, FileText } from 'lucide-react';

const NuevaSolicitud = ({ onSubmit, grupos = [], insumos = [] }) => {
  const [selectedGrupo, setSelectedGrupo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredInsumos, setFilteredInsumos] = useState(insumos);

  useEffect(() => {
    const filtered = insumos.filter(insumo =>
      insumo.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredInsumos(filtered);
  }, [searchTerm, insumos]);

  const addItem = (insumo) => {
    const existing = selectedItems.find(item => item.idInsumo === insumo.idInsumo);
    if (existing) {
      setSelectedItems(prev =>
        prev.map(item =>
          item.idInsumo === insumo.idInsumo
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      );
    } else {
      setSelectedItems(prev => [...prev, {
        idInsumo: insumo.idInsumo,
        nombre: insumo.nombre,
        cantidad: 1,
        stock: insumo.stock
      }]);
    }
  };

  const updateQuantity = (idInsumo, cantidad) => {
    if (cantidad <= 0) {
      setSelectedItems(prev => prev.filter(item => item.idInsumo !== idInsumo));
    } else {
      setSelectedItems(prev =>
        prev.map(item =>
          item.idInsumo === idInsumo ? { ...item, cantidad } : item
        )
      );
    }
  };

  const removeItem = (idInsumo) => {
    setSelectedItems(prev => prev.filter(item => item.idInsumo !== idInsumo));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedGrupo || selectedItems.length === 0) {
      alert('Por favor seleccione un grupo y al menos un insumo');
      return;
    }
    onSubmit({
      idGrupo: selectedGrupo,
      observaciones,
      items: selectedItems.map(item => ({
        idInsumo: item.idInsumo,
        cantidad: item.cantidad
      }))
    });
  };

  const totalItems = selectedItems.reduce((sum, item) => sum + item.cantidad, 0);
  const selectedItemNames = selectedItems.map(item => item.nombre).join(', ');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nueva Solicitud de Material
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de Grupo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Grupo</label>
              <select
                value={selectedGrupo}
                onChange={(e) => setSelectedGrupo(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Seleccionar grupo...</option>
                {grupos.map(grupo => (
                  <option key={grupo.idGrupo} value={grupo.idGrupo}>
                    {grupo.idGrupo} - {grupo.practica_descripcion} ({grupo.curso_nombre})
                  </option>
                ))}
              </select>
            </div>

            {/* Búsqueda de Insumos */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Insumos</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar insumos disponibles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Lista de Insumos Disponibles */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Insumos Disponibles</label>
              <div className="border rounded-md max-h-60 overflow-y-auto">
                {filteredInsumos.map(insumo => (
                  <div
                    key={insumo.idInsumo}
                    className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{insumo.nombre}</div>
                      <div className="text-sm text-gray-500">
                        Stock: {insumo.stock} | Tipo: {insumo.tipoNombre}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => addItem(insumo)}
                      disabled={insumo.stock === 0}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Insumos Solicitados - Sin scroll manual, mostrar todo */}
            {selectedItems.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Insumos Solicitados</label>
                <div className="border rounded-md">
                  {selectedItems.map(item => (
                    <div
                      key={item.idInsumo}
                      className="flex items-center justify-between p-3 border-b last:border-b-0"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.nombre}</div>
                        <div className="text-sm text-gray-500">
                          Stock disponible: {item.stock}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.idInsumo, item.cantidad - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center">{item.cantidad}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.idInsumo, item.cantidad + 1)}
                          disabled={item.cantidad >= item.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeItem(item.idInsumo)}
                        >
                          Quitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Observaciones (opcional)</label>
              <Textarea
                placeholder="Observaciones adicionales sobre la solicitud..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
              />
            </div>

            {/* Resumen */}
            {selectedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5" />
                    Resumen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Cantidad de insumos:</span>
                    <Badge variant="secondary">{totalItems}</Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-sm">Insumos escogidos:</span>
                    <p 
                      className="text-sm text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap"
                      title={selectedItemNames}
                    >
                      {selectedItemNames || 'Ninguno'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botón de Registrar - Al final de todo */}
            <div className="pt-4 border-t">
              <Button
                type="submit"
                className="w-full"
                disabled={!selectedGrupo || selectedItems.length === 0}
              >
                Registrar Solicitud
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NuevaSolicitud;
