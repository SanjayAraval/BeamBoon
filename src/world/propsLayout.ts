export interface PropDef {
  id: string;
  name: string;
  type: string;
  w: number;
  d: number;
  h: number;
  x: number;
  z: number;
  floor: number;
  facing: 'N' | 'S' | 'E' | 'W';
  color: number;
  interactable?: string; // interaction type
  supportId?: string; // id of the prop this sits on
  isCollider?: boolean; // defaults to true unless resting on top of furniture
  isLight?: boolean;
}

export const propsLayout: PropDef[] = [
  // LIVING ROOM
  { id: 'tv_unit', name: 'TV Unit', type: 'box', w: 0.5, d: 1.6, h: 0.5, x: 0.45, z: 8.5, floor: 0, facing: 'E', color: 0x333333 },
  { id: 'tv_screen', name: 'TV', type: 'box', w: 0.1, d: 1.2, h: 0.7, x: 0.45, z: 8.5, floor: 0, facing: 'E', color: 0x111111, interactable: 'tv', supportId: 'tv_unit', isCollider: false },
  { id: 'curtains_living', name: 'Curtains', type: 'box', w: 0.06, d: 2.2, h: 2.4, x: 3.0, z: 11.84, floor: 0, facing: 'N', color: 0x5a1a1a, interactable: 'curtains', isCollider: false },
  { id: 'sofa', name: 'Sofa', type: 'box', w: 2.1, d: 0.9, h: 0.85, x: 3.6, z: 8.5, floor: 0, facing: 'W', color: 0x554444 },
  { id: 'coffee_rug', name: 'Rug', type: 'plane', w: 2.4, d: 1.6, h: 0, x: 2.4, z: 8.5, floor: 0, facing: 'W', color: 0x662222, isCollider: false },
  { id: 'coffee_table', name: 'Coffee Table', type: 'box', w: 1.1, d: 0.6, h: 0.45, x: 2.4, z: 8.5, floor: 0, facing: 'W', color: 0x443322 },
  { id: 'armchair', name: 'Armchair', type: 'box', w: 0.9, d: 0.9, h: 0.85, x: 3.0, z: 6.0, floor: 0, facing: 'W', color: 0x554444 },
  { id: 'side_table', name: 'Side Table', type: 'box', w: 0.5, d: 0.5, h: 0.55, x: 3.6, z: 10.0, floor: 0, facing: 'W', color: 0x443322 },
  { id: 'vase', name: 'Vase', type: 'cylinder', w: 0.2, d: 0.2, h: 0.4, x: 3.6, z: 10.0, floor: 0, facing: 'N', color: 0xaaaabb, supportId: 'side_table', isCollider: false },
  { id: 'bookshelf_living', name: 'Bookshelf', type: 'box', w: 0.35, d: 1.4, h: 1.8, x: 1.5, z: 5.3, floor: 0, facing: 'S', color: 0x3a2818 },
  { id: 'floor_lamp', name: 'Floor Lamp', type: 'cylinder', w: 0.3, d: 0.3, h: 1.6, x: 0.5, z: 11.3, floor: 0, facing: 'E', color: 0xdddddd, interactable: 'lamp_living', isLight: true },
  { id: 'console_table', name: 'Console Table', type: 'box', w: 0.4, d: 1.0, h: 0.8, x: 5.7, z: 11.0, floor: 0, facing: 'W', color: 0x443322 },
  { id: 'family_photo', name: 'Family Photo', type: 'box', w: 0.03, d: 0.3, h: 0.25, x: 5.7, z: 11.0, floor: 0, facing: 'W', color: 0xeeeeee, supportId: 'console_table', isCollider: false },
  
  // FOYER
  { id: 'coat_rack', name: 'Coat Rack', type: 'cylinder', w: 0.3, d: 0.3, h: 1.8, x: 6.35, z: 11.5, floor: 0, facing: 'E', color: 0x222222 },
  { id: 'shoe_rack', name: 'Shoe Rack', type: 'box', w: 0.7, d: 0.3, h: 0.4, x: 8.45, z: 11.8, floor: 0, facing: 'N', color: 0x332211 },
  { id: 'phone_table', name: 'Phone Table', type: 'box', w: 0.4, d: 0.6, h: 0.7, x: 6.35, z: 6.0, floor: 0, facing: 'E', color: 0x443322 },
  { id: 'landline_phone', name: 'Landline Phone', type: 'box', w: 0.2, d: 0.25, h: 0.15, x: 6.35, z: 6.0, floor: 0, facing: 'E', color: 0x111111, supportId: 'phone_table', isCollider: false, interactable: 'phone' },
  { id: 'wall_mirror', name: 'Wall Mirror', type: 'plane', w: 0.8, d: 0.05, h: 1.2, x: 6.7, z: 11.9, floor: 0, facing: 'N', color: 0xaaaacc, isCollider: false },

  // STUDY
  { id: 'desk', name: 'Desk', type: 'box', w: 0.8, d: 1.6, h: 0.75, x: 12.0, z: 11.4, floor: 0, facing: 'N', color: 0x2a1a1a },
  { id: 'police_radio', name: 'Police Radio', type: 'box', w: 0.2, d: 0.1, h: 0.15, x: 12.0, z: 11.4, floor: 0, facing: 'N', color: 0x111111, supportId: 'desk', isCollider: false, interactable: 'radio' },
  { id: 'case_files', name: 'Case Files', type: 'box', w: 0.3, d: 0.4, h: 0.2, x: 12.0, z: 11.0, floor: 0, facing: 'N', color: 0xddccaa, supportId: 'desk', isCollider: false },
  { id: 'desk_chair', name: 'Desk Chair', type: 'box', w: 0.5, d: 0.5, h: 0.9, x: 12.0, z: 10.5, floor: 0, facing: 'S', color: 0x222222 },
  { id: 'filing_cabinet', name: 'Filing Cabinet', type: 'box', w: 0.5, d: 0.5, h: 1.3, x: 13.6, z: 8.0, floor: 0, facing: 'W', color: 0x444444 },
  { id: 'bookshelf_study', name: 'Bookshelf', type: 'box', w: 0.35, d: 1.4, h: 1.8, x: 12.0, z: 5.3, floor: 0, facing: 'S', color: 0x3a2818 },
  { id: 'cork_board', name: 'Cork Board', type: 'plane', w: 1.5, d: 0.05, h: 1.0, x: 13.9, z: 8.0, floor: 0, facing: 'W', color: 0xaa8866, isCollider: false },

  // KITCHEN
  { id: 'counter_n', name: 'North Counter', type: 'box', w: 0.65, d: 2.2, h: 0.9, x: 1.2, z: 0.325, floor: 0, facing: 'S', color: 0xcccccc },
  { id: 'knife_block', name: 'Knife Block', type: 'box', w: 0.15, d: 0.2, h: 0.25, x: 1.2, z: 0.4, floor: 0, facing: 'S', color: 0x443322, supportId: 'counter_n', isCollider: false, interactable: 'knife' },
  { id: 'kitchen_lamp', name: 'Kitchen Lamp', type: 'cylinder', w: 0.15, d: 0.15, h: 0.3, x: 0.4, z: 0.4, floor: 0, facing: 'S', color: 0xdddddd, supportId: 'counter_n', isCollider: false, interactable: 'lamp_kitchen', isLight: true },
  { id: 'counter_w', name: 'West Counter', type: 'box', w: 0.6, d: 4.2, h: 0.9, x: 0.3, z: 2.8, floor: 0, facing: 'E', color: 0xcccccc },
  { id: 'stove', name: 'Stove', type: 'box', w: 0.7, d: 0.7, h: 0.9, x: 4.2, z: 0.4, floor: 0, facing: 'S', color: 0x111111 },
  { id: 'fridge', name: 'Fridge', type: 'box', w: 0.7, d: 0.7, h: 1.8, x: 5.5, z: 0.45, floor: 0, facing: 'S', color: 0xdddddd },
  { id: 'island', name: 'Kitchen Island', type: 'box', w: 0.9, d: 1.8, h: 0.9, x: 3.0, z: 3.0, floor: 0, facing: 'S', color: 0x333333 },
  { id: 'stool_1', name: 'Stool 1', type: 'cylinder', w: 0.35, d: 0.35, h: 0.7, x: 2.4, z: 3.8, floor: 0, facing: 'N', color: 0x222222 },
  { id: 'stool_2', name: 'Stool 2', type: 'cylinder', w: 0.35, d: 0.35, h: 0.7, x: 3.6, z: 3.8, floor: 0, facing: 'N', color: 0x222222 },
  { id: 'bin', name: 'Bin', type: 'cylinder', w: 0.4, d: 0.4, h: 0.6, x: 5.6, z: 4.6, floor: 0, facing: 'N', color: 0x111111 },

  // DINING ROOM
  { id: 'dining_table', name: 'Dining Table', type: 'box', w: 1.0, d: 2.0, h: 0.75, x: 8.6, z: 2.5, floor: 0, facing: 'S', color: 0x3a2818 },
  { id: 'chair_1', name: 'Chair 1', type: 'box', w: 0.4, d: 0.4, h: 0.9, x: 7.9, z: 1.6, floor: 0, facing: 'S', color: 0x222222 },
  { id: 'chair_2', name: 'Chair 2', type: 'box', w: 0.4, d: 0.4, h: 0.9, x: 8.6, z: 1.6, floor: 0, facing: 'S', color: 0x222222 },
  { id: 'chair_3', name: 'Chair 3', type: 'box', w: 0.4, d: 0.4, h: 0.9, x: 9.3, z: 1.6, floor: 0, facing: 'S', color: 0x222222 },
  { id: 'chair_4', name: 'Chair 4', type: 'box', w: 0.4, d: 0.4, h: 0.9, x: 7.9, z: 3.4, floor: 0, facing: 'N', color: 0x222222 },
  { id: 'chair_5', name: 'Chair 5', type: 'box', w: 0.4, d: 0.4, h: 0.9, x: 8.6, z: 3.4, floor: 0, facing: 'N', color: 0x222222 },
  { id: 'chair_6', name: 'Chair 6', type: 'box', w: 0.4, d: 0.4, h: 0.9, x: 9.3, z: 3.4, floor: 0, facing: 'N', color: 0x222222 },
  { id: 'sideboard', name: 'Sideboard', type: 'box', w: 0.45, d: 1.6, h: 0.85, x: 8.6, z: 0.35, floor: 0, facing: 'S', color: 0x443322 },
  { id: 'bowl', name: 'Bowl', type: 'cylinder', w: 0.3, d: 0.3, h: 0.15, x: 8.6, z: 0.35, floor: 0, facing: 'S', color: 0xeeeeee, supportId: 'sideboard', isCollider: false },

  // POWDER ROOM
  { id: 'toilet_ground', name: 'Toilet', type: 'box', w: 0.6, d: 0.4, h: 0.8, x: 12.5, z: 0.45, floor: 0, facing: 'S', color: 0xffffff },
  { id: 'vanity_ground', name: 'Vanity', type: 'box', w: 0.5, d: 0.9, h: 0.85, x: 13.65, z: 2.5, floor: 0, facing: 'W', color: 0xeeeeee },

  // UPSTAIRS HALL
  { id: 'hall_table', name: 'Hall Table', type: 'box', w: 0.4, d: 1.0, h: 0.8, x: 8.0, z: 0.4, floor: 1, facing: 'S', color: 0x443322 },
  { id: 'hall_lamp', name: 'Hall Lamp', type: 'cylinder', w: 0.2, d: 0.2, h: 0.4, x: 8.0, z: 0.4, floor: 1, facing: 'S', color: 0xdddddd, supportId: 'hall_table', isCollider: false, interactable: 'lamp_hallway', isLight: true },
  { id: 'hall_rug', name: 'Runner Rug', type: 'plane', w: 1.0, d: 10.0, h: 0, x: 7.5, z: 6.0, floor: 1, facing: 'N', color: 0x773333, isCollider: false },

  // PLAYER BEDROOM
  { id: 'bed_player', name: 'Bed', type: 'box', w: 1.4, d: 2.0, h: 0.5, x: 1.1, z: 2.0, floor: 1, facing: 'E', color: 0x334455 },
  { id: 'nightstand_player', name: 'Nightstand', type: 'box', w: 0.4, d: 0.4, h: 0.5, x: 1.0, z: 0.8, floor: 1, facing: 'E', color: 0x443322 },
  { id: 'lamp_player', name: 'Bedside Lamp', type: 'cylinder', w: 0.15, d: 0.15, h: 0.3, x: 1.0, z: 0.8, floor: 1, facing: 'E', color: 0xdddddd, supportId: 'nightstand_player', isCollider: false, interactable: 'lamp_player', isLight: true },
  { id: 'desk_player', name: 'Desk', type: 'box', w: 0.7, d: 1.4, h: 0.75, x: 3.5, z: 0.45, floor: 1, facing: 'S', color: 0x3a2818 },
  { id: 'chair_player', name: 'Desk Chair', type: 'box', w: 0.5, d: 0.5, h: 0.9, x: 3.5, z: 1.3, floor: 1, facing: 'N', color: 0x222222 },
  { id: 'wardrobe_player', name: 'Wardrobe', type: 'box', w: 0.6, d: 1.2, h: 2.0, x: 4.8, z: 4.7, floor: 1, facing: 'N', color: 0x443322 },

  // MASTER BEDROOM
  { id: 'bed_master', name: 'Double Bed', type: 'box', w: 1.6, d: 2.1, h: 0.55, x: 3.5, z: 6.2, floor: 1, facing: 'S', color: 0x553344 },
  { id: 'nightstand_m1', name: 'Nightstand L', type: 'box', w: 0.4, d: 0.4, h: 0.5, x: 2.3, z: 5.4, floor: 1, facing: 'S', color: 0x443322 },
  { id: 'nightstand_m2', name: 'Nightstand R', type: 'box', w: 0.4, d: 0.4, h: 0.5, x: 4.7, z: 5.4, floor: 1, facing: 'S', color: 0x443322 },
  { id: 'lamp_m1', name: 'Bedside Lamp', type: 'cylinder', w: 0.15, d: 0.15, h: 0.3, x: 2.3, z: 5.4, floor: 1, facing: 'S', color: 0xdddddd, supportId: 'nightstand_m1', isCollider: false, interactable: 'lamp_m1', isLight: true },
  { id: 'lamp_m2', name: 'Bedside Lamp', type: 'cylinder', w: 0.15, d: 0.15, h: 0.3, x: 4.7, z: 5.4, floor: 1, facing: 'S', color: 0xdddddd, supportId: 'nightstand_m2', isCollider: false, interactable: 'lamp_m2', isLight: true },
  { id: 'dresser_master', name: 'Dresser', type: 'box', w: 0.5, d: 1.4, h: 0.9, x: 4.9, z: 11.6, floor: 1, facing: 'N', color: 0x443322 },
  { id: 'police_badge', name: 'Police Badge', type: 'box', w: 0.1, d: 0.1, h: 0.05, x: 4.9, z: 11.6, floor: 1, facing: 'N', color: 0xd4af37, supportId: 'dresser_master', isCollider: false, interactable: 'badge' },
  { id: 'wallet', name: 'Wallet', type: 'box', w: 0.1, d: 0.1, h: 0.02, x: 4.9, z: 11.4, floor: 1, facing: 'N', color: 0x221111, supportId: 'dresser_master', isCollider: false },

  // WALK-IN CLOSET
  { id: 'clothes_rail', name: 'Clothes Rail', type: 'box', w: 0.4, d: 1.8, h: 1.7, x: 0.3, z: 10.9, floor: 1, facing: 'E', color: 0x444444 },
  { id: 'gun_safe', name: 'Gun Safe', type: 'box', w: 0.5, d: 0.5, h: 0.7, x: 1.8, z: 11.6, floor: 1, facing: 'N', color: 0x111111, interactable: 'gun_safe' },

  // BATHROOM
  { id: 'bathtub', name: 'Bathtub', type: 'box', w: 1.7, d: 0.75, h: 0.5, x: 13.15, z: 0.475, floor: 1, facing: 'S', color: 0xffffff },
  { id: 'toilet_up', name: 'Toilet', type: 'box', w: 0.6, d: 0.4, h: 0.8, x: 13.65, z: 2.5, floor: 1, facing: 'W', color: 0xffffff },
  { id: 'vanity_up', name: 'Vanity', type: 'box', w: 0.5, d: 0.9, h: 0.85, x: 12.0, z: 4.1, floor: 1, facing: 'N', color: 0xeeeeee },

  // SPARE ROOM
  { id: 'bed_spare', name: 'Single Bed', type: 'box', w: 1.0, d: 2.0, h: 0.5, x: 13.0, z: 10.5, floor: 1, facing: 'W', color: 0x889988 },
  { id: 'wardrobe_spare', name: 'Large Wardrobe', type: 'box', w: 0.6, d: 1.4, h: 2.0, x: 11.0, z: 11.5, floor: 1, facing: 'N', color: 0x443322 },
  { id: 'box_1', name: 'Box 1', type: 'box', w: 0.5, d: 0.5, h: 0.5, x: 13.2, z: 5.4, floor: 1, facing: 'W', color: 0x8b5a2b },
  { id: 'box_2', name: 'Box 2', type: 'box', w: 0.5, d: 0.5, h: 0.5, x: 13.2, z: 6.2, floor: 1, facing: 'W', color: 0x8b5a2b },
  { id: 'sewing_table', name: 'Sewing Table', type: 'box', w: 0.5, d: 1.2, h: 0.8, x: 12.0, z: 5.2, floor: 1, facing: 'S', color: 0x5a3a2a }
];
