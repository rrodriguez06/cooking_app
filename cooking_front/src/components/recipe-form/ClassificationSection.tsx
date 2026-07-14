import { useFormContext, Controller } from 'react-hook-form';
import { Tags, Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MultiSelect } from '@/components/ui/combobox';
import { Button } from '@/components/ui/Button';
import type { Category, Tag, Equipment } from '@/types';
import { FormSection } from './FormSection';
import type { RecipeFormData } from './schema';

interface ClassificationSectionProps {
  categories: Category[];
  tags: Tag[];
  equipments: Equipment[];
  onCreateEquipment: () => void;
}

/** Bloc « Classement » : catégories, tags et équipements en onglets avec recherche + chips. */
export function ClassificationSection({
  categories,
  tags,
  equipments,
  onCreateEquipment,
}: ClassificationSectionProps) {
  const { control } = useFormContext<RecipeFormData>();

  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));
  const tagOptions = tags.map((t) => ({ value: String(t.id), label: t.name }));
  const equipmentOptions = equipments.map((e) => ({
    value: String(e.id),
    label: e.name,
    icon: e.icon ? <span className="text-base">{e.icon}</span> : undefined,
  }));

  return (
    <FormSection
      id="classement"
      title="Classement"
      icon={<Tags className="h-5 w-5 text-primary" />}
      description="Catégories, tags et matériel pour retrouver et filtrer la recette."
    >
      <Tabs defaultValue="categories">
        <TabsList className="mb-4">
          <TabsTrigger value="categories">Catégories</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="equipements">Équipements</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Controller
            control={control}
            name="category_ids"
            render={({ field }) => (
              <MultiSelect
                options={categoryOptions}
                values={field.value.map(String)}
                onChange={(vals) => field.onChange(vals.map(Number))}
                placeholder="Aucune catégorie"
                addLabel="Ajouter une catégorie"
                searchPlaceholder="Rechercher une catégorie…"
              />
            )}
          />
        </TabsContent>

        <TabsContent value="tags">
          <Controller
            control={control}
            name="tag_ids"
            render={({ field }) => (
              <MultiSelect
                options={tagOptions}
                values={field.value.map(String)}
                onChange={(vals) => field.onChange(vals.map(Number))}
                placeholder="Aucun tag"
                addLabel="Ajouter un tag"
                searchPlaceholder="Rechercher un tag…"
              />
            )}
          />
        </TabsContent>

        <TabsContent value="equipements">
          <div className="space-y-3">
            <Controller
              control={control}
              name="equipment_ids"
              render={({ field }) => (
                <MultiSelect
                  options={equipmentOptions}
                  values={field.value.map(String)}
                  onChange={(vals) => field.onChange(vals.map(Number))}
                  placeholder="Aucun équipement"
                  addLabel="Ajouter un équipement"
                  searchPlaceholder="Rechercher un équipement…"
                />
              )}
            />
            <Button type="button" variant="ghost" size="sm" onClick={onCreateEquipment} className="gap-1.5 text-primary hover:text-primary">
              <Plus className="h-4 w-4" />
              Créer un nouvel équipement
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </FormSection>
  );
}
