import React, { useState } from 'react';
import { Star } from 'phosphor-react';

const StarRating = ({ rating, setRating, readOnly = false }) => {
    const [hover, setHover] = useState(0);

    return (
        <div style={{ display: 'flex' }}>
            {[1, 2, 3, 4, 5].map((star) => {
                return (
                    <div
                        key={star}
                        style={{
                            cursor: readOnly ? 'default' : 'pointer',
                        }}
                        onClick={() => !readOnly && setRating(star)}
                        onMouseEnter={() => !readOnly && setHover(star)}
                        onMouseLeave={() => !readOnly && setHover(rating)}
                    >
                        <Star
                            size={24}
                            weight="fill"
                            color={(hover || rating) >= star ? '#FFC107' : '#E0E0E0'}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default StarRating;
