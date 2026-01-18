import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: 'srcType', label: 'SRC Type' },
  { value: 'tsType', label: 'TS Type' },
  { value: 'filmForDyed', label: 'Film for Dyed' },
  { value: 'adhesiveType', label: 'Adhesive Type' }
];

export default function MaterialOptionsManager() {
  const [newOption, setNewOption] = useState({ category: 'srcType', value: '' });
  const queryClient = useQueryClient();

  const { data: materials = [] } = useQuery({
    queryKey: ['material-options-admin'],
    queryFn: () => api.entities.MaterialOption.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.MaterialOption.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-options-admin'] });
      queryClient.invalidateQueries({ queryKey: ['material-options'] });
      setNewOption({ category: 'srcType', value: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.MaterialOption.update(id, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-options-admin'] });
      queryClient.invalidateQueries({ queryKey: ['material-options'] });
    }
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newOption.value.trim()) return;
    createMutation.mutate({
      category: newOption.category,
      value: newOption.value.trim(),
      isActive: true
    });
  };

  const getCategoryLabel = (cat) => CATEGORIES.find(c => c.value === cat)?.label || cat;

  const groupedMaterials = CATEGORIES.map(cat => ({
    category: cat.value,
    label: cat.label,
    items: materials.filter(m => m.category === cat.value && m.isActive)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Material Options Manager</CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Manage dropdown options for material selection in defect intake
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Option */}
        <form onSubmit={handleAdd} className="p-4 border rounded-lg bg-blue-50">
          <p className="text-sm font-medium text-blue-900 mb-3">Add New Material Option</p>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select 
                value={newOption.category} 
                onValueChange={(val) => setNewOption({...newOption, category: val})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Value</Label>
              <Input
                value={newOption.value}
                onChange={(e) => setNewOption({...newOption, value: e.target.value})}
                placeholder="e.g., XMC 9A"
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isPending || !newOption.value.trim()}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* List Options by Category */}
        <div className="space-y-4">
          {groupedMaterials.map(group => (
            <div key={group.category} className="p-4 border rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">{group.label}</h3>
              {group.items.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {group.items.map(item => (
                    <Badge 
                      key={item.id} 
                      className="bg-gray-100 text-gray-800 flex items-center gap-2 px-3 py-1.5"
                    >
                      {item.value}
                      <button
                        onClick={() => deleteMutation.mutate(item.id)}
                        className="hover:text-red-600 transition-colors"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No options added yet</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}