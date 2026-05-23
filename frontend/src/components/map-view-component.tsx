'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, OverlayViewF, InfoWindowF } from '@react-google-maps/api';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { BACKEND_URL } from '@/lib/backend-url';

interface Location {
  lat: string | number;
  lng: string | number;
}

export interface HeatmapDataItem {
  name: string;
  area: string;
  location: Location;
  intensity: string | number;
  count: string | number;
  alert_level: string;
  apiTimestamp?: string;
  firestoreTimestamp?: any;
  lastUpdated?: string;
  id?: string;
}

interface PointOfInterest {
  name: string;
  icon: string;
  location: { lat: number; lng: number };
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '75vh',
  position: 'relative',
  borderRadius: '8px',
  overflow: 'hidden',
};

const mapContainerStyle = { width: '100%', height: '100%' };

const statusStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '10px',
  left: '10px',
  zIndex: 1000,
  padding: '8px 12px',
  backgroundColor: 'rgba(0,0,0,0.7)',
  color: 'white',
  borderRadius: '5px',
  fontSize: '12px',
};

const legendStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '10px',
  right: '10px',
  zIndex: 1000,
  padding: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderRadius: '5px',
  boxShadow: '0 0 10px rgba(0,0,0,0.2)',
  fontSize: '12px',
  color: 'black',
};

const legendItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '5px',
 };
 
 const colorBoxStyle = (color: string): React.CSSProperties => ({
  width: '15px',
  height: '15px',
  backgroundColor: color,
  marginRight: '8px',
  borderRadius: '50%',
  border: '1px solid #ccc',
  flexShrink: 0,
});

const defaultCenter = { lat: 12.979699, lng: 77.719194 };

const calculateCenter = (locations: HeatmapDataItem[]): google.maps.LatLngLiteral => {
  if (locations.length === 0) return defaultCenter;
  const sum = locations.reduce(
    (acc, item) => ({
      lat: acc.lat + parseFloat(item.location.lat.toString()),
      lng: acc.lng + parseFloat(item.location.lng.toString()),
    }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / locations.length, lng: sum.lng / locations.length };
};

const getAlertColor = (alertLevel: string): string => {
  switch (alertLevel?.toLowerCase()) {
    case 'high':
    case 'critical':
      return '#ef4444';
    case 'warning':
    case 'medium':
      return '#f59e0b';
    case 'normal':
    case 'low':
    default:
      return '#22c55e';
  }
};

const generatePOIs = (baseLocation: Location): PointOfInterest[] => {
  const baseLat = parseFloat(baseLocation.lat.toString());
  const baseLng = parseFloat(baseLocation.lng.toString());
  return [
    { name: 'Washroom', icon: '🚻', location: { lat: baseLat + 0.001, lng: baseLng + 0.001 } },
    { name: 'Cloak Room', icon: '🧥', location: { lat: baseLat - 0.001, lng: baseLng - 0.001 } },
    { name: 'Smoking Zone', icon: '🚬', location: { lat: baseLat + 0.001, lng: baseLng - 0.001 } },
    { name: 'Hydration Area', icon: '💧', location: { lat: baseLat - 0.001, lng: baseLng + 0.001 } },
    { name: 'Lost and Found', icon: '❓', location: { lat: baseLat, lng: baseLng + 0.0015 } },
  ];
};

const LIBRARIES: ('places' | 'geometry' | 'drawing' | 'visualization')[] = [];

const MapLegend = () => (
  <div style={legendStyle}>
    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Legend</div>
    <div style={legendItemStyle}>
      <span style={colorBoxStyle('#ef4444')}></span> High Density Crowd
    </div>
    <div style={legendItemStyle}>
      <span style={colorBoxStyle('#f59e0b')}></span> Medium Density Crowd
    </div>
    <div style={legendItemStyle}>
      <span style={colorBoxStyle('#22c55e')}></span> Normal Density Crowd
    </div>
    <div style={legendItemStyle}>
      <span style={colorBoxStyle('#3b82f6')}></span> Points of Interest
    </div>
  </div>
);

interface MarkerInfoState {
  type: 'heatmap' | 'poi';
  item: HeatmapDataItem | PointOfInterest;
  position: google.maps.LatLngLiteral;
}

export interface MapViewPageProps {
  highlightPoi?: string | null;
}

export const MapViewPage: React.FC<MapViewPageProps> = ({ highlightPoi }) => {
  const [locations, setLocations] = useState<HeatmapDataItem[]>([]);
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(defaultCenter);
  const [selectedMarker, setSelectedMarker] = useState<MarkerInfoState | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: LIBRARIES,
  });

  const API_ENDPOINT = `${BACKEND_URL}/api/heatmap`;

  const storeInFirestore = async (heatmapData: HeatmapDataItem[], timestamp: string): Promise<void> => {
    try {
      const promises = heatmapData.map(async (item, index) => {
        const docRef = doc(db, 'heatmap_data', `location_${item.area || index}`);
        await setDoc(docRef, { ...item, apiTimestamp: timestamp, firestoreTimestamp: serverTimestamp() });
      });
      await Promise.all(promises);
    } catch (err) {
      console.error('Error storing data in Firestore: ', err);
    }
  };

  const processMapData = useCallback((data: HeatmapDataItem[]) => {
    setLocations(data);
    if (data.length > 0) {
      const center = calculateCenter(data);
      setMapCenter(center);
      if (mapRef.current) {
        mapRef.current.panTo(center);
        mapRef.current.setZoom(15);
      }
      setPois(generatePOIs(data[0].location));
    }
  }, []);

  const loadFromFirestore = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'heatmap_data'));
      const firestoreData: HeatmapDataItem[] = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as HeatmapDataItem)
      );
      if (firestoreData.length > 0) {
        processMapData(firestoreData);
      } else {
        setError('No data in Firestore, and API fetch failed.');
      }
    } catch (err) {
      console.error('Error loading from Firestore: ', err);
      setError('Failed to load data from Firestore.');
    } finally {
      setLoading(false);
    }
  }, [processMapData]);

  const fetchFromAPI = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINT);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const apiResponse = await response.json();
      const heatmapDataArray: HeatmapDataItem[] = apiResponse.heatmap || [];
      if (heatmapDataArray.length === 0) throw new Error('No heatmap data received from API');
      await storeInFirestore(heatmapDataArray, apiResponse.timestamp);
      processMapData(heatmapDataArray);
    } catch (err: any) {
      console.error('Error fetching from API: ', err);
      setError(`Failed to fetch data from API: ${err.message}`);
      await loadFromFirestore();
    } finally {
      setLoading(false);
    }
  }, [API_ENDPOINT, processMapData, loadFromFirestore]);

  useEffect(() => {
    if (!isLoaded) return;
    fetchFromAPI();
    const interval = setInterval(fetchFromAPI, 15000);
    return () => clearInterval(interval);
  }, [isLoaded, fetchFromAPI]);

  useEffect(() => {
    if (highlightPoi && pois.length > 0) {
      const matchedPoi = pois.find(p => p.name.toLowerCase() === highlightPoi.toLowerCase());
      if (matchedPoi) {
        setSelectedMarker({
          type: 'poi',
          item: matchedPoi,
          position: matchedPoi.location
        });
        setMapCenter(matchedPoi.location);
        if (mapRef.current) {
          mapRef.current.panTo(matchedPoi.location);
          mapRef.current.setZoom(16);
        }
      }
    }
  }, [highlightPoi, pois]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (loadError || (!googleMapsApiKey && isLoaded === false)) {
    return (
      <div className="aspect-video w-full bg-muted rounded-lg flex flex-col items-center justify-center text-center p-4">
        <div className="text-destructive mb-2">⚠️</div>
        <p className="text-sm text-muted-foreground">
          Google Maps failed to load. Please check your API key configuration.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && locations.length === 0) {
    return (
      <div className="aspect-video w-full bg-muted rounded-lg flex flex-col items-center justify-center text-center p-4">
        <div className="text-destructive mb-2">⚠️</div>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={fetchFromAPI} className="mt-2" variant="outline" disabled={loading}>
          {loading ? 'Retrying...' : 'Retry'}
        </Button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={14}
        onLoad={onMapLoad}
        options={{
          mapTypeId: 'roadmap',
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ],
        }}
        onClick={() => setSelectedMarker(null)}
      >
        {/* Crowd heatmap markers */}
        {locations.map((item, index) => {
          const lat = parseFloat(item.location.lat.toString());
          const lng = parseFloat(item.location.lng.toString());
          const color = getAlertColor(item.alert_level);
          const isSelected =
            selectedMarker?.type === 'heatmap' && selectedMarker.item === item;

          return (
            <OverlayViewF
              key={`heatmap-${item.area || index}`}
              position={{ lat, lng }}
              mapPaneName="overlayMouseTarget"
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMarker({ type: 'heatmap', item, position: { lat, lng } });
                }}
                title={item.name}
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: color,
                  borderRadius: '50%',
                  border: `3px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.6)'}`,
                  boxShadow: `0 0 ${isSelected ? '12px' : '6px'} ${color}`,
                  cursor: 'pointer',
                  transform: 'translate(-50%, -50%)',
                  transition: 'box-shadow 0.2s, border 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Pulsing ring for critical */}
                {item.alert_level?.toLowerCase() === 'critical' && (
                  <span
                    style={{
                      position: 'absolute',
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      border: `2px solid ${color}`,
                      animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                      opacity: 0.6,
                    }}
                  />
                )}
              </div>
            </OverlayViewF>
          );
        })}

        {/* POI markers */}
        {pois.map((poi, index) => {
          const isSelected =
            selectedMarker?.type === 'poi' && selectedMarker.item === poi;
          return (
            <OverlayViewF
              key={`poi-${index}`}
              position={poi.location}
              mapPaneName="overlayMouseTarget"
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMarker({ type: 'poi', item: poi, position: poi.location });
                }}
                title={poi.name}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  border: `2px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.7)'}`,
                  boxShadow: `0 0 6px rgba(59,130,246,0.7)`,
                  cursor: 'pointer',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  transition: 'border 0.2s',
                }}
              >
                {poi.icon}
              </div>
            </OverlayViewF>
          );
        })}

        {/* Info Window */}
        {selectedMarker && (
          <InfoWindowF
            position={selectedMarker.position}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div style={{ color: '#111', minWidth: '160px', fontFamily: 'sans-serif' }}>
              {selectedMarker.type === 'heatmap' ? (() => {
                const item = selectedMarker.item as HeatmapDataItem;
                const color = getAlertColor(item.alert_level);
                return (
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700 }}>{item.name}</h3>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>📍 Area: <b>{item.area}</b></p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>
                      🔥 Density: <b>{item.intensity}%</b>
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>👥 Count: <b>{item.count}</b></p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                      Alert:{' '}
                      <span
                        style={{
                          background: color,
                          color: '#fff',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          fontSize: '11px',
                        }}
                      >
                        {item.alert_level}
                      </span>
                    </p>
                  </div>
                );
              })() : (() => {
                const poi = selectedMarker.item as PointOfInterest;
                return (
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
                      {poi.icon} {poi.name}
                    </p>
                  </div>
                );
              })()}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {loading && (
        <div style={statusStyle}>
          Fetching map data...
        </div>
      )}

      <MapLegend />

      {/* Ping animation for critical markers */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
export default MapViewPage;
