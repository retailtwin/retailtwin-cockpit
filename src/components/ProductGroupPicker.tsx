import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronRight, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface Product {
  sku: string;
  name: string;
  group_1: string;
  group_2: string;
  group_3: string;
}

interface ProductGroupPickerProps {
  products: Product[];
  selectedSKUs: string[] | 'ALL';
  onSelectionChange: (skus: string[] | 'ALL') => void;
}

interface GroupNode {
  name: string;
  count: number;
  skus: string[];
  children: Map<string, GroupNode>;
}

export const ProductGroupPicker = ({
  products,
  selectedSKUs,
  onSelectionChange,
}: ProductGroupPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Build hierarchical structure
  const groupTree = useMemo(() => {
    const root: GroupNode = {
      name: 'root',
      count: products.length,
      skus: products.map(p => p.sku),
      children: new Map(),
    };

    products.forEach(product => {
      const g1 = product.group_1 || 'Uncategorized';
      const g2 = product.group_2 || 'Other';

      // Level 1
      if (!root.children.has(g1)) {
        root.children.set(g1, {
          name: g1,
          count: 0,
          skus: [],
          children: new Map(),
        });
      }
      const g1Node = root.children.get(g1)!;
      g1Node.count++;
      g1Node.skus.push(product.sku);

      // Level 2
      if (!g1Node.children.has(g2)) {
        g1Node.children.set(g2, {
          name: g2,
          count: 0,
          skus: [],
          children: new Map(),
        });
      }
      const g2Node = g1Node.children.get(g2)!;
      g2Node.count++;
      g2Node.skus.push(product.sku);
    });

    return root;
  }, [products]);

  // Filter based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupTree.children;

    const query = searchQuery.toLowerCase();
    const filtered = new Map<string, GroupNode>();

    groupTree.children.forEach((g1Node, g1Name) => {
      const matchingG2 = new Map<string, GroupNode>();

      g1Node.children.forEach((g2Node, g2Name) => {
        // Check if any product in this group matches
        const matchingProducts = products.filter(p =>
          (p.group_1 === g1Name && p.group_2 === g2Name) &&
          (p.name.toLowerCase().includes(query) ||
           p.sku.toLowerCase().includes(query) ||
           p.group_1.toLowerCase().includes(query) ||
           p.group_2.toLowerCase().includes(query))
        );

        if (matchingProducts.length > 0) {
          matchingG2.set(g2Name, {
            ...g2Node,
            count: matchingProducts.length,
            skus: matchingProducts.map(p => p.sku),
          });
        }
      });

      if (matchingG2.size > 0) {
        const totalCount = Array.from(matchingG2.values()).reduce((sum, node) => sum + node.count, 0);
        filtered.set(g1Name, {
          ...g1Node,
          count: totalCount,
          skus: Array.from(matchingG2.values()).flatMap(node => node.skus),
          children: matchingG2,
        });
      }
    });

    return filtered;
  }, [groupTree, searchQuery, products]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const isGroupSelected = (skus: string[]) => {
    if (selectedSKUs === 'ALL') return true;
    return skus.every(sku => selectedSKUs.includes(sku));
  };

  const isGroupPartiallySelected = (skus: string[]) => {
    if (selectedSKUs === 'ALL') return false;
    return skus.some(sku => selectedSKUs.includes(sku)) && !isGroupSelected(skus);
  };

  const handleSelectGroup = (skus: string[]) => {
    if (selectedSKUs === 'ALL') {
      // If all selected, deselect all except these
      onSelectionChange(skus);
    } else {
      const isSelected = isGroupSelected(skus);
      if (isSelected) {
        // Deselect these SKUs
        onSelectionChange(selectedSKUs.filter(sku => !skus.includes(sku)));
      } else {
        // Add these SKUs
        const newSelection = [...new Set([...selectedSKUs, ...skus])];
        onSelectionChange(newSelection);
      }
    }
  };

  const handleSelectAll = () => {
    onSelectionChange('ALL');
  };

  const selectedCount = selectedSKUs === 'ALL' ? products.length : selectedSKUs.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Select Products</Label>
        <Badge variant="secondary">{selectedCount} of {products.length} selected</Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products, groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Select All */}
      <Button
        variant={selectedSKUs === 'ALL' ? 'default' : 'outline'}
        size="sm"
        onClick={handleSelectAll}
        className="w-full"
      >
        All Products ({products.length})
      </Button>

      {/* Group Tree */}
      <div className="border rounded-lg max-h-80 overflow-y-auto">
        {Array.from(filteredGroups.entries()).map(([g1Name, g1Node]) => (
          <div key={g1Name} className="border-b last:border-0">
            <Collapsible
              open={expandedGroups.has(g1Name)}
              onOpenChange={() => toggleGroup(g1Name)}
            >
              <div className="flex items-center hover:bg-muted/50 transition-colors">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start font-medium px-3 py-2"
                  >
                    {expandedGroups.has(g1Name) ? (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    {g1Name}
                    <Badge variant="outline" className="ml-2">
                      {g1Node.count}
                    </Badge>
                  </Button>
                </CollapsibleTrigger>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectGroup(g1Node.skus)}
                  className={`mr-2 ${
                    isGroupSelected(g1Node.skus)
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : isGroupPartiallySelected(g1Node.skus)
                      ? 'bg-primary/50'
                      : ''
                  }`}
                >
                  Select
                </Button>
              </div>

              <CollapsibleContent>
                <div className="pl-6 space-y-1">
                  {Array.from(g1Node.children.entries()).map(([g2Name, g2Node]) => (
                    <div
                      key={`${g1Name}-${g2Name}`}
                      className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{g2Name}</span>
                        <Badge variant="outline" className="text-xs">
                          {g2Node.count}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectGroup(g2Node.skus)}
                        className={`text-xs ${
                          isGroupSelected(g2Node.skus)
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : isGroupPartiallySelected(g2Node.skus)
                            ? 'bg-primary/50'
                            : ''
                        }`}
                      >
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ))}

        {filteredGroups.size === 0 && (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No products match your search
          </div>
        )}
      </div>
    </div>
  );
};
