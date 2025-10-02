import React, { useEffect, useState } from 'react';
import { Layout, Pagination, Card, Button, Input } from '../components';
import { categoryService, tagService, ingredientService, equipmentService } from '../services';
import { usePagination } from '../hooks';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';

type DataType = 'categories' | 'tags' | 'ingredients' | 'equipment';

interface DataItem {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const DataManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DataType>('categories');
  const [data, setData] = useState<DataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const pagination = usePagination(1);

  const getService = (type: DataType) => {
    switch (type) {
      case 'categories': return categoryService;
      case 'tags': return tagService;
      case 'ingredients': return ingredientService;
      case 'equipment': return equipmentService;
    }
  };

  const getTitle = (type: DataType): string => {
    switch (type) {
      case 'categories': return 'Catégories';
      case 'tags': return 'Tags';
      case 'ingredients': return 'Ingrédients';
      case 'equipment': return 'Équipements';
    }
  };

  const loadData = async (page: number = 1, search: string = '') => {
    try {
      setIsLoading(true);
      const service = getService(activeTab);
      const params: any = {
        page,
        limit: 20
      };

      if (search) {
        params.search = search;
      }

      const response = await (service as any).getCategories ? 
        (service as any).getCategories(params) :
        (service as any).getTags ?
        (service as any).getTags(params) :
        (service as any).getIngredients ?
        (service as any).getIngredients(params) :
        (service as any).getEquipments(params);

      if (response.success) {
        setData(response.data);
        // Pour l'instant, on simule la pagination car les API n'ont pas toutes les mêmes réponses
        pagination.setPaginationData({
          currentPage: page,
          totalPages: Math.ceil(response.data.length / 20),
          totalCount: response.data.length,
          hasNext: page < Math.ceil(response.data.length / 20),
          hasPrev: page > 1
        });
      }
    } catch (error) {
      console.error(`Erreur lors du chargement des ${getTitle(activeTab).toLowerCase()}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(1, searchTerm);
    pagination.resetPagination();
  }, [activeTab]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData(1, searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    pagination.goToPage(page);
    loadData(page, searchTerm);
  };

  const handleTabChange = (tab: DataType) => {
    setActiveTab(tab);
    setSearchTerm('');
  };

  const tabs = [
    { key: 'categories' as DataType, label: 'Catégories' },
    { key: 'tags' as DataType, label: 'Tags' },
    { key: 'ingredients' as DataType, label: 'Ingrédients' },
    { key: 'equipment' as DataType, label: 'Équipements' },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestion des données
          </h1>
          <p className="text-gray-600">
            Gérez les catégories, tags, ingrédients et équipements de l'application
          </p>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Barre de recherche et actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder={`Rechercher dans ${getTitle(activeTab).toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button className="ml-4 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Ajouter {getTitle(activeTab).slice(0, -1)}</span>
          </Button>
        </div>

        {/* Contenu */}
        {isLoading ? (
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : data.length === 0 ? (
          <Card className="p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucun élément trouvé
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 
                `Aucun résultat pour "${searchTerm}"` :
                `Aucun ${getTitle(activeTab).toLowerCase()} disponible`
              }
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {data.map((item) => (
                <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                      {item.name}
                    </h3>
                    <div className="flex space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-8 w-8"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    Créé le {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={pagination.pagination.currentPage}
              totalPages={pagination.pagination.totalPages}
              totalCount={pagination.pagination.totalCount}
              onPageChange={handlePageChange}
              className="mt-8"
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default DataManagementPage;