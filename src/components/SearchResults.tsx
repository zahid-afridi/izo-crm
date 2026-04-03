'use client';

import { useState, useEffect } from 'react';
import { Search, X, FileText, Users, MapPin, Car, Package, ShoppingCart, FileCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

interface SearchResult {
    id: string;
    type: string;
    title: string;
    description?: string;
    subtitle?: string;
    image?: string;
    url: string;
}

interface SearchResultsProps {
    isOpen: boolean;
    onClose: () => void;
    initialQuery?: string;
    onNavigate: (url: string) => void;
}

const typeIcons = {
    product: Package,
    service: FileText,
    client: Users,
    site: MapPin,
    worker: Users,
    order: ShoppingCart,
    offer: FileCheck,
    car: Car
};

const typeColors = {
    product: 'bg-blue-100 text-blue-800',
    service: 'bg-green-100 text-green-800',
    client: 'bg-purple-100 text-purple-800',
    site: 'bg-orange-100 text-orange-800',
    worker: 'bg-indigo-100 text-indigo-800',
    order: 'bg-red-100 text-red-800',
    offer: 'bg-yellow-100 text-yellow-800',
    car: 'bg-gray-100 text-gray-800'
};

export function SearchResults({ isOpen, onClose, initialQuery = '', onNavigate }: SearchResultsProps) {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedType, setSelectedType] = useState<string>('');

    const searchTypes = [
        { value: '', label: 'All' },
        { value: 'products', label: 'Products' },
        { value: 'services', label: 'Services' },
        { value: 'clients', label: 'Clients' },
        { value: 'sites', label: 'Sites' },
        { value: 'workers', label: 'Workers' },
        { value: 'orders', label: 'Orders' },
        { value: 'offers', label: 'Offers' },
        { value: 'cars', label: 'Cars' }
    ];

    useEffect(() => {
        if (initialQuery) {
            performSearch(initialQuery);
        }
    }, [initialQuery]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (query.length >= 2) {
                performSearch(query);
            } else if (query.length >= 1) {
                fetchSuggestions(query);
            } else {
                setResults([]);
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [query, selectedType]);

    const performSearch = async (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                q: searchQuery,
                limit: '50'
            });

            if (selectedType) {
                params.append('type', selectedType);
            }

            const response = await fetch(`/api/search?${params}`);
            const data = await response.json();

            if (response.ok) {
                setResults(data.results || []);
                setSuggestions([]);
            } else {
                console.error('Search error:', data.error);
                setResults([]);
            }
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuggestions = async (searchQuery: string) => {
        try {
            const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            setSuggestions(data.suggestions || []);
        } catch (error) {
            console.error('Suggestions failed:', error);
            setSuggestions([]);
        }
    };

    const handleResultClick = (result: SearchResult) => {
        onNavigate(result.url);
        onClose();
    };

    const handleSuggestionClick = (suggestion: string) => {
        setQuery(suggestion);
        performSearch(suggestion);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search everything..."
                                className="pl-10 pr-4 py-3 text-lg"
                                autoFocus
                            />
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Search Type Filters */}
                    <div className="flex flex-wrap gap-2">
                        {searchTypes.map((type) => (
                            <Button
                                key={type.value}
                                variant={selectedType === type.value ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedType(type.value)}
                            >
                                {type.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {loading && (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-500 mt-2">Searching...</p>
                        </div>
                    )}

                    {/* Suggestions */}
                    {suggestions.length > 0 && !loading && (
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                                <Search className="w-4 h-4" />
                                Suggestions
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {suggestions.map((suggestion, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="text-left"
                                    >
                                        {suggestion}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {results.length > 0 && !loading && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-4">
                                {results.length} result{results.length !== 1 ? 's' : ''} found
                            </h3>
                            <div className="space-y-3">
                                {results.map((result) => {
                                    const Icon = typeIcons[result.type as keyof typeof typeIcons] || FileText;
                                    const colorClass = typeColors[result.type as keyof typeof typeColors] || 'bg-gray-100 text-gray-800';

                                    return (
                                        <Card
                                            key={`${result.type}-${result.id}`}
                                            className="cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => handleResultClick(result)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-4">
                                                    {result.image ? (
                                                        <img
                                                            src={result.image}
                                                            alt={result.title}
                                                            className="w-12 h-12 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                                            <Icon className="w-6 h-6 text-gray-600" />
                                                        </div>
                                                    )}

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-medium text-gray-900 truncate">
                                                                    {result.title}
                                                                </h4>
                                                                {result.description && (
                                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                                        {result.description}
                                                                    </p>
                                                                )}
                                                                {result.subtitle && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {result.subtitle}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <Badge variant="secondary" className={colorClass}>
                                                                {result.type}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* No Results */}
                    {query.length >= 2 && results.length === 0 && !loading && (
                        <div className="text-center py-8">
                            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                            <p className="text-gray-500">
                                Try adjusting your search terms or removing filters
                            </p>
                        </div>
                    )}

                    {/* Empty State */}
                    {query.length < 2 && results.length === 0 && suggestions.length === 0 && !loading && (
                        <div className="text-center py-8">
                            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Start typing to search</h3>
                            <p className="text-gray-500">
                                Search across products, services, clients, sites, and more
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}