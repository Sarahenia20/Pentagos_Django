"""
Algorithmic Art Generation - Non-AI Pattern Generation
Pure Python mathematical art generators using PIL/Pillow
No external APIs, instant generation, deterministic results
"""

from PIL import Image, ImageDraw
import math
import random
from typing import Tuple, List
import colorsys


class AlgorithmicArtGenerator:
    """Base class for algorithmic art generation"""
    
    def __init__(self, width: int = 1024, height: int = 1024, bg_color: str = '#FFFFFF'):
        self.width = width
        self.height = height
        self.bg_color = self._hex_to_rgb(bg_color) if bg_color.startswith('#') else bg_color
        self.image = Image.new('RGB', (width, height), self.bg_color)
        self.draw = ImageDraw.Draw(self.image)
    
    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex color to RGB tuple"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def save(self, filepath: str):
        """Save the generated image"""
        self.image.save(filepath, 'PNG')
        return filepath


class GeometricPatternGenerator(AlgorithmicArtGenerator):
    """Generate geometric patterns and tessellations"""
    
    def concentric_circles(self, num_circles: int = 20, color_scheme: str = 'rainbow', base_color: str = '#FF0000'):
        """Concentric circles with gradient colors"""
        center_x, center_y = self.width // 2, self.height // 2
        max_radius = min(self.width, self.height) // 2
        
        for i in range(num_circles, 0, -1):
            radius = (max_radius * i) // num_circles
            
            # Color based on scheme
            if color_scheme == 'rainbow':
                hue = i / num_circles
                rgb = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
                color = tuple(int(c * 255) for c in rgb)
            elif color_scheme == 'monochrome':
                gray = int(255 * (i / num_circles))
                color = (gray, gray, gray)
            elif color_scheme == 'custom':
                # Use base_color with varying intensity
                base_rgb = self._hex_to_rgb(base_color)
                intensity = i / num_circles
                color = tuple(int(c * intensity) for c in base_rgb)
            else:  # blue gradient
                color = (0, int(255 * (i / num_circles)), 255)
            
            bbox = [center_x - radius, center_y - radius, 
                    center_x + radius, center_y + radius]
            self.draw.ellipse(bbox, fill=color, outline=None)
        
        return self.image
    
    def spiral_circles(self, num_circles: int = 50, turns: int = 3):
        """Logarithmic spiral of circles"""
        center_x, center_y = self.width // 2, self.height // 2
        
        for i in range(num_circles):
            angle = (i / num_circles) * turns * 2 * math.pi
            radius = 10 + (i / num_circles) * min(self.width, self.height) // 3
            
            x = center_x + int(radius * math.cos(angle))
            y = center_y + int(radius * math.sin(angle))
            
            circle_size = 5 + int(20 * (i / num_circles))
            
            # Rainbow color
            hue = i / num_circles
            rgb = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
            color = tuple(int(c * 255) for c in rgb)
            
            bbox = [x - circle_size, y - circle_size, 
                    x + circle_size, y + circle_size]
            self.draw.ellipse(bbox, fill=color, outline=None)
        
        return self.image
    
    def hexagonal_grid(self, hex_size: int = 30):
        """Hexagonal tessellation with random colors"""
        hex_height = int(hex_size * math.sqrt(3))
        
        for row in range(-1, self.height // hex_height + 2):
            for col in range(-1, self.width // (hex_size * 3 // 2) + 2):
                x = col * (hex_size * 3 // 2)
                y = row * hex_height
                
                # Offset every other row
                if col % 2 == 1:
                    y += hex_height // 2
                
                # Random color
                hue = random.random()
                rgb = colorsys.hsv_to_rgb(hue, 0.7, 0.9)
                color = tuple(int(c * 255) for c in rgb)
                
                # Draw hexagon
                points = self._hexagon_points(x, y, hex_size)
                self.draw.polygon(points, fill=color, outline=(0, 0, 0))
        
        return self.image
    
    def _hexagon_points(self, x: int, y: int, size: int) -> List[Tuple[int, int]]:
        """Calculate hexagon vertices"""
        points = []
        for i in range(6):
            angle = math.pi / 3 * i
            px = x + int(size * math.cos(angle))
            py = y + int(size * math.sin(angle))
            points.append((px, py))
        return points


class FractalGenerator(AlgorithmicArtGenerator):
    """Generate fractal patterns"""
    
    def sierpinski_triangle(self, depth: int = 7):
        """Sierpinski triangle fractal"""
        # Three corner points
        p1 = (self.width // 2, 50)
        p2 = (50, self.height - 50)
        p3 = (self.width - 50, self.height - 50)
        
        # Start at random point
        current = (random.randint(0, self.width), random.randint(0, self.height))
        
        # Generate 50000 points
        for i in range(50000):
            # Pick random corner
            target = random.choice([p1, p2, p3])
            
            # Move halfway to target
            current = ((current[0] + target[0]) // 2, 
                      (current[1] + target[1]) // 2)
            
            # Color based on iteration
            hue = (i % 1000) / 1000
            rgb = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
            color = tuple(int(c * 255) for c in rgb)
            
            # Draw point
            self.draw.point(current, fill=color)
        
        return self.image
    
    def mandelbrot_set(self, max_iter: int = 100):
        """Mandelbrot set visualization"""
        for x in range(self.width):
            for y in range(self.height):
                # Map pixel to complex plane
                real = (x - self.width * 0.7) / (self.width * 0.25)
                imag = (y - self.height * 0.5) / (self.height * 0.25)
                
                c = complex(real, imag)
                z = complex(0, 0)
                
                # Check if point is in set
                iteration = 0
                while abs(z) <= 2 and iteration < max_iter:
                    z = z * z + c
                    iteration += 1
                
                # Color based on iterations
                if iteration == max_iter:
                    color = (0, 0, 0)  # Inside set
                else:
                    hue = iteration / max_iter
                    rgb = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
                    color = tuple(int(c * 255) for c in rgb)
                
                self.draw.point((x, y), fill=color)
        
        return self.image
    
    def recursive_tree(self, depth: int = 10, angle: float = 25):
        """Recursive tree fractal"""
        start_x = self.width // 2
        start_y = self.height - 50
        length = min(self.width, self.height) // 5
        
        self._draw_branch(start_x, start_y, length, -90, depth, angle)
        return self.image
    
    def _draw_branch(self, x, y, length, angle, depth, branch_angle):
        """Recursively draw tree branches"""
        if depth == 0:
            return
        
        # Calculate end point
        end_x = x + int(length * math.cos(math.radians(angle)))
        end_y = y + int(length * math.sin(math.radians(angle)))
        
        # Color based on depth (green to brown)
        hue = 0.3 - (depth / 30)  # Green to brown
        rgb = colorsys.hsv_to_rgb(hue, 0.7, 0.7)
        color = tuple(int(c * 255) for c in rgb)
        
        # Draw branch
        width = max(1, depth // 2)
        self.draw.line([x, y, end_x, end_y], fill=color, width=width)
        
        # Recursively draw sub-branches
        new_length = length * 0.7
        self._draw_branch(end_x, end_y, new_length, angle - branch_angle, depth - 1, branch_angle)
        self._draw_branch(end_x, end_y, new_length, angle + branch_angle, depth - 1, branch_angle)


class GenerativePatternGenerator(AlgorithmicArtGenerator):
    """Generate procedural patterns"""
    
    def random_walk(self, num_walkers: int = 5, steps: int = 2000):
        """Multiple random walk particles"""
        walkers = [(self.width // 2, self.height // 2) for _ in range(num_walkers)]
        
        for step in range(steps):
            for i, (x, y) in enumerate(walkers):
                # Random direction
                dx = random.randint(-2, 2)
                dy = random.randint(-2, 2)
                
                new_x = max(0, min(self.width - 1, x + dx))
                new_y = max(0, min(self.height - 1, y + dy))
                
                # Color based on walker ID
                hue = i / num_walkers
                rgb = colorsys.hsv_to_rgb(hue, 0.7, 0.9)
                color = tuple(int(c * 255) for c in rgb)
                
                # Draw line
                self.draw.line([x, y, new_x, new_y], fill=color, width=2)
                
                walkers[i] = (new_x, new_y)
        
        return self.image
    
    def voronoi_diagram(self, num_points: int = 20):
        """Voronoi diagram with random seed points"""
        # Generate random seed points
        seeds = [(random.randint(0, self.width), random.randint(0, self.height)) 
                 for _ in range(num_points)]
        
        # Assign colors to seeds
        colors = []
        for i in range(num_points):
            hue = i / num_points
            rgb = colorsys.hsv_to_rgb(hue, 0.7, 0.9)
            colors.append(tuple(int(c * 255) for c in rgb))
        
        # For each pixel, find closest seed
        pixels = self.image.load()
        for x in range(self.width):
            for y in range(self.height):
                min_dist = float('inf')
                closest_seed = 0
                
                for i, (sx, sy) in enumerate(seeds):
                    dist = (x - sx) ** 2 + (y - sy) ** 2
                    if dist < min_dist:
                        min_dist = dist
                        closest_seed = i
                
                pixels[x, y] = colors[closest_seed]
        
        # Draw seed points
        for sx, sy in seeds:
            bbox = [sx - 3, sy - 3, sx + 3, sy + 3]
            self.draw.ellipse(bbox, fill=(0, 0, 0))
        
        return self.image
    
    def wave_interference(self, num_sources: int = 4):
        """Wave interference pattern"""
        # Random wave sources
        sources = [(random.randint(self.width // 4, 3 * self.width // 4),
                   random.randint(self.height // 4, 3 * self.height // 4))
                   for _ in range(num_sources)]
        
        pixels = self.image.load()
        wavelength = 40
        
        for x in range(self.width):
            for y in range(self.height):
                # Sum waves from all sources
                amplitude = 0
                for sx, sy in sources:
                    dist = math.sqrt((x - sx) ** 2 + (y - sy) ** 2)
                    amplitude += math.sin(dist / wavelength * 2 * math.pi)
                
                # Normalize and convert to color
                amplitude = (amplitude + num_sources) / (2 * num_sources)  # 0 to 1
                
                hue = amplitude
                rgb = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
                color = tuple(int(c * 255) for c in rgb)
                
                pixels[x, y] = color
        
        return self.image


class SpirographGenerator(AlgorithmicArtGenerator):
    """Generate spirograph-like patterns"""
    
    def spirograph(self, R: int = 200, r: int = 50, d: int = 80, rotations: int = 20):
        """
        Generate spirograph pattern
        R: radius of fixed circle
        r: radius of moving circle  
        d: distance of pen from center of moving circle
        """
        center_x, center_y = self.width // 2, self.height // 2
        points = []
        
        # Generate points
        steps = rotations * 360
        for i in range(steps):
            t = i * 2 * math.pi / 360
            
            x = (R - r) * math.cos(t) + d * math.cos((R - r) / r * t)
            y = (R - r) * math.sin(t) - d * math.sin((R - r) / r * t)
            
            points.append((center_x + int(x), center_y + int(y)))
        
        # Draw with gradient colors
        for i in range(len(points) - 1):
            hue = i / len(points)
            rgb = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
            color = tuple(int(c * 255) for c in rgb)
            
            self.draw.line([points[i], points[i + 1]], fill=color, width=2)
        
        return self.image


# Factory function for easy access
def generate_algorithmic_art(pattern_type: str, size: int = 1024, **params) -> Image:
    """
    Generate algorithmic art by type
    
    Args:
        pattern_type: Type of pattern to generate
        size: Image size (square)
        **params: Pattern-specific parameters
    
    Returns:
        PIL Image object
    """
    # Extract color parameters
    bg_color = params.pop('bg_color', '#FFFFFF')
    base_color = params.pop('base_color', '#FF0000')
    
    generators = {
        # Geometric
        'concentric_circles': lambda: GeometricPatternGenerator(size, size, bg_color).concentric_circles(
            params.get('num_circles', 20), 
            params.get('color_scheme', 'rainbow'),
            base_color
        ),
        'spiral_circles': lambda: GeometricPatternGenerator(size, size, bg_color).spiral_circles(
            params.get('num_circles', 50),
            params.get('turns', 3)
        ),
        'hexagonal_grid': lambda: GeometricPatternGenerator(size, size, bg_color).hexagonal_grid(
            params.get('hex_size', 30)
        ),
        
        # Fractals
        'sierpinski_triangle': lambda: FractalGenerator(size, size, bg_color).sierpinski_triangle(
            params.get('depth', 7)
        ),
        'mandelbrot_set': lambda: FractalGenerator(size, size, bg_color).mandelbrot_set(
            params.get('max_iter', 100)
        ),
        'recursive_tree': lambda: FractalGenerator(size, size, bg_color).recursive_tree(
            params.get('depth', 10),
            params.get('angle', 25)
        ),
        
        # Generative
        'random_walk': lambda: GenerativePatternGenerator(size, size, bg_color).random_walk(
            params.get('num_walkers', 5),
            params.get('steps', 2000)
        ),
        'voronoi_diagram': lambda: GenerativePatternGenerator(size, size, bg_color).voronoi_diagram(
            params.get('num_points', 20)
        ),
        'wave_interference': lambda: GenerativePatternGenerator(size, size, bg_color).wave_interference(
            params.get('num_sources', 4)
        ),
        
        # Spirograph
        'spirograph': lambda: SpirographGenerator(size, size, bg_color).spirograph(
            params.get('R', 200),
            params.get('r', 50),
            params.get('d', 80),
            params.get('rotations', 20)
        ),
    }
    
    if pattern_type not in generators:
        raise ValueError(f"Unknown pattern type: {pattern_type}. Available: {list(generators.keys())}")
    
    return generators[pattern_type]()


# Pattern metadata for UI
PATTERN_CATALOG = {
    'concentric_circles': {
        'name': 'Concentric Circles',
        'description': 'Mathematical nested circles with customizable gradient colors',
        'category': 'geometric',
        'params': {
            'num_circles': {'type': 'int', 'min': 5, 'max': 50, 'default': 20},
            'color_scheme': {'type': 'choice', 'options': ['rainbow', 'monochrome', 'custom', 'blue'], 'default': 'rainbow'},
            'base_color': {'type': 'color', 'default': '#FF0000'},
            'bg_color': {'type': 'color', 'default': '#FFFFFF'}
        }
    },
    'spiral_circles': {
        'name': 'Spiral Circles',
        'description': 'Logarithmic spiral of colored circles',
        'category': 'geometric',
        'params': {
            'num_circles': {'type': 'int', 'min': 20, 'max': 100, 'default': 50},
            'turns': {'type': 'int', 'min': 1, 'max': 10, 'default': 3}
        }
    },
    'hexagonal_grid': {
        'name': 'Hexagonal Grid',
        'description': 'Tessellation of colored hexagons',
        'category': 'geometric',
        'params': {
            'hex_size': {'type': 'int', 'min': 10, 'max': 100, 'default': 30}
        }
    },
    'sierpinski_triangle': {
        'name': 'Sierpinski Triangle',
        'description': 'Classic chaos game fractal',
        'category': 'fractal',
        'params': {
            'depth': {'type': 'int', 'min': 5, 'max': 10, 'default': 7}
        }
    },
    'mandelbrot_set': {
        'name': 'Mandelbrot Set',
        'description': 'Famous fractal visualization',
        'category': 'fractal',
        'params': {
            'max_iter': {'type': 'int', 'min': 50, 'max': 200, 'default': 100}
        }
    },
    'recursive_tree': {
        'name': 'Recursive Tree',
        'description': 'Branching tree fractal',
        'category': 'fractal',
        'params': {
            'depth': {'type': 'int', 'min': 5, 'max': 15, 'default': 10},
            'angle': {'type': 'int', 'min': 15, 'max': 45, 'default': 25}
        }
    },
    'random_walk': {
        'name': 'Random Walk',
        'description': 'Multiple particles wandering randomly',
        'category': 'generative',
        'params': {
            'num_walkers': {'type': 'int', 'min': 1, 'max': 10, 'default': 5},
            'steps': {'type': 'int', 'min': 1000, 'max': 5000, 'default': 2000}
        }
    },
    'voronoi_diagram': {
        'name': 'Voronoi Diagram',
        'description': 'Space partitioning pattern',
        'category': 'generative',
        'params': {
            'num_points': {'type': 'int', 'min': 5, 'max': 50, 'default': 20}
        }
    },
    'wave_interference': {
        'name': 'Wave Interference',
        'description': 'Multiple wave sources creating patterns',
        'category': 'generative',
        'params': {
            'num_sources': {'type': 'int', 'min': 2, 'max': 8, 'default': 4}
        }
    },
    'spirograph': {
        'name': 'Spirograph',
        'description': 'Mathematical drawing toy simulation',
        'category': 'spirograph',
        'params': {
            'R': {'type': 'int', 'min': 100, 'max': 400, 'default': 200},
            'r': {'type': 'int', 'min': 20, 'max': 100, 'default': 50},
            'd': {'type': 'int', 'min': 20, 'max': 150, 'default': 80},
            'rotations': {'type': 'int', 'min': 10, 'max': 50, 'default': 20}
        }
    },
}
