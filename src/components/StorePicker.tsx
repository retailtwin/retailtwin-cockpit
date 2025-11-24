import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Location {
  code: string;
  name: string;
}

interface StorePickerProps {
  locations: Location[];
  selectedLocation: string;
  onLocationChange: (location: string) => void;
}

export const StorePicker = ({
  locations,
  selectedLocation,
  onLocationChange,
}: StorePickerProps) => {
  return (
    <div className="space-y-2">
      <Label>Select Store</Label>
      <Select value={selectedLocation} onValueChange={onLocationChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select location" />
        </SelectTrigger>
        <SelectContent>
          {locations.map((loc) => (
            <SelectItem key={loc.code} value={loc.code}>
              {loc.code} - {loc.name || loc.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
