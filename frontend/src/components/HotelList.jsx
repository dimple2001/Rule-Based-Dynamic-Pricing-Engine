import React, { useState, useMemo, useEffect } from 'react';
import HotelCard from './HotelCard';
import { mockHotels } from '../data/mockHotels';
import './HotelList.css';

const HotelList = ({ searchLocation }) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('recommended');
  const [quotesById, setQuotesById] = useState({});

  const categories = ['All', 'Mountains', 'City'];

  const filteredHotels = useMemo(() => {
    let result = mockHotels;

    // 1. Filter by Search Location
    if (searchLocation && searchLocation.trim() !== '') {
      result = result.filter(hotel =>
        hotel.location.toLowerCase().includes(searchLocation.toLowerCase()) ||
        hotel.name.toLowerCase().includes(searchLocation.toLowerCase())
      );
    }

    // 2. Filter by Category
    if (activeCategory !== 'All') {
      result = result.filter(hotel => hotel.category === activeCategory);
    }

    return result;
  }, [searchLocation, activeCategory]);

  useEffect(() => {
    if (filteredHotels.length === 0) return;
    let cancelled = false;

    const fetchQuotes = async () => {
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

      const payload = filteredHotels.map(hotel => {
        const ml = hotel.ml;
        return {
          hotel_id: hotel.id,
          features: {
            base_price: hotel.pricing.basePrice,
            day_of_week: dayOfWeek,
            hotel: ml.hotel,
            season: ml.season,
            adults: ml.adults,
            children: ml.children,
            babies: ml.babies,
            market_segment: ml.market_segment,
            lead_time: ml.lead_time,
            duration_days: 1,
          }
        };
      });

      try {
        const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL || ''}/api/calculate-prices-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`Server returned ${response.status}`);

        const data = await response.json();

        if (!cancelled) {
          setQuotesById((prev) => {
            const next = { ...prev };
            for (const [id, dataObj] of Object.entries(data)) {
              next[id] = dataObj;
            }
            return next;
          });
        }

      } catch (error) {
        console.error("Failed to fetch batch prices", error);
      }
    };

    fetchQuotes();
    return () => {
      cancelled = true;
    };
  }, [filteredHotels]);

  const processedHotels = useMemo(() => {
    // 3. Pre-calculate prices for sorting
    const hotelsWithPrice = filteredHotels.map(hotel => {
      const liveQuote = quotesById[hotel.id];
      const computedPrice = liveQuote?.daily_rate ?? liveQuote?.final_price ?? null;
      return { ...hotel, liveQuote, computedPrice };
    });

    // 4. Sort
    if (sortBy === 'price-low') {
      hotelsWithPrice.sort((a, b) => (a.computedPrice ?? Number.MAX_SAFE_INTEGER) - (b.computedPrice ?? Number.MAX_SAFE_INTEGER));
    } else if (sortBy === 'price-high') {
      hotelsWithPrice.sort((a, b) => (b.computedPrice ?? 0) - (a.computedPrice ?? 0));
    }

    return hotelsWithPrice;
  }, [filteredHotels, quotesById, sortBy]);

  return (
    <section className="hotel-list-section">
      <div className="container">
        <div className="section-header" style={{ flexWrap: 'wrap' }}>
          <div>
            <h2 className="section-title">
              {searchLocation ? `Search Results for "${searchLocation}"` : "Trending Destinations"}
            </h2>
            <p className="section-subtitle">Prices dynamically adjusted based on real-time demand.</p>
          </div>

          <div className="filter-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="filter-tabs">
              {categories.map(category => (
                <button
                  key={category}
                  className={`tab ${activeCategory === category ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="hotel-grid">
          {processedHotels.length > 0 ? (
            processedHotels.map(hotel => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))
          ) : (
            <div className="no-results" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 0' }}>
              <h3>No hotels found.</h3>
              <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HotelList;
